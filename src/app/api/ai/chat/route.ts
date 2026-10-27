import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { ASSISTANT_SYSTEM, buildFinancialContext, SEARCH_COSTS_TOOL, searchCosts } from "@/lib/ai/context";
import {
  ADD_CHECKLIST_ITEM_TOOL,
  ADD_SUPPLIER_TOOL,
  describeAction,
  executeActions,
  planAction,
  REGISTER_EXPENSE_TOOL,
  signProposal,
  verifyProposal,
  WRITE_TOOL_NAMES,
  type ProposedAction,
} from "@/lib/ai/proposals";
import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";
import { getObraModule } from "@/lib/obra";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
  confirm: z.string().max(20_000).optional(),
});

const TOOLS = [SEARCH_COSTS_TOOL, REGISTER_EXPENSE_TOOL, ADD_SUPPLIER_TOOL, ADD_CHECKLIST_ITEM_TOOL];

const CLAIMS_WRITE =
  /cart[aã]o|(confer|confir)\w*[^.!?\n]{0,40}resumo|resumo[^.!?\n]{0,40}(confer|confir)|\b(registrei|gravei|cadastrei|lancei|anotei)\b|\b(pronto|j[aá]|foi|est[aá]|fica|ficou)[,!.]?\s+(registrad|gravad|cadastrad|lan[cç]ad|anotad)/i;

const NO_TOOL_NUDGE =
  "[mensagem do sistema, não do usuário] Sua última resposta fala em resumo, cartão ou registro, mas você não " +
  "chamou nenhuma ferramenta, então NADA foi preparado nem gravado. Se já tem item, valor, fornecedor e situação, " +
  "chame register_expense agora. Se falta algum dado, pergunte só o que falta, sem falar em resumo nem em registro.";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (!ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = createSupabaseServer();

  if (parsed.data.confirm) {
    if (ctx.role === "viewer") return NextResponse.json({ reply: "Seu acesso é só de leitura, não consigo gravar." });
    const actions = verifyProposal(parsed.data.confirm, ctx.householdId, ctx.userId);
    if (!actions) {
      return NextResponse.json({ reply: "Essa proposta expirou. Me manda de novo o que quer registrar." });
    }
    const mod = await getObraModule(ctx.householdId);
    if (!mod) return NextResponse.json({ reply: "Não encontrei a obra ativa." });
    const { done, failed } = await executeActions(db, ctx.householdId, mod.id, actions);
    const lines = [];
    if (done.length) lines.push(`✅ Registrado: ${done.join("; ")}.`);
    if (failed.length) lines.push(`⚠️ Não consegui gravar: ${failed.join("; ")}. Tenta de novo.`);
    return NextResponse.json({ reply: lines.join("\n"), saved: done.length > 0 });
  }

  const env = getServerEnv();
  const financialContext = await buildFinancialContext({ householdId: ctx.householdId });
  const system = `${ASSISTANT_SYSTEM}\n\nHoje é ${new Date().toISOString().slice(0, 10)}.\n\n--- FINANCIAL CONTEXT ---\n${financialContext}`;

  try {
    const householdId = ctx.householdId;
    const history: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }));
    const proposed: ProposedAction[] = [];
    const canWrite = ctx.role !== "viewer";

    async function runTool(tu: Anthropic.ToolUseBlock): Promise<string> {
      if (tu.name === SEARCH_COSTS_TOOL.name) return searchCosts(householdId, tu.input as Record<string, string>);
      if (!WRITE_TOOL_NAMES.has(tu.name)) return "Ferramenta desconhecida.";
      if (!canWrite) return "O usuário tem acesso só de leitura. Diga que não dá pra registrar.";
      const plan = await planAction(db, householdId, tu.name, tu.input as Record<string, unknown>);
      if ("error" in plan) return plan.error;
      proposed.push(plan.action);
      return `Proposta preparada, AINDA NÃO GRAVADA: ${describeAction(plan.action)} O app mostra o resumo com Confirmar/Cancelar.`;
    }

    async function converse(): Promise<string> {
      let res = await client().messages.create({ model: env.ANTHROPIC_MODEL, max_tokens: 800, system, messages: history, tools: TOOLS });
      let rounds = 0;
      while (res.stop_reason === "tool_use" && rounds < 3) {
        rounds++;
        const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        if (toolUses.length === 0) break;
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          results.push({ type: "tool_result", tool_use_id: tu.id, content: await runTool(tu) });
        }
        history.push({ role: "assistant", content: res.content });
        history.push({ role: "user", content: results });
        res = await client().messages.create({ model: env.ANTHROPIC_MODEL, max_tokens: 800, system, messages: history, tools: TOOLS });
      }
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    }

    let text = await converse();

    // O modelo às vezes diz "confere o resumo" ou "registrado" sem ter chamado ferramenta nenhuma.
    if (proposed.length === 0 && CLAIMS_WRITE.test(text)) {
      history.push({ role: "assistant", content: text || "." });
      history.push({ role: "user", content: NO_TOOL_NUDGE });
      text = await converse();
      if (proposed.length === 0 && CLAIMS_WRITE.test(text)) {
        text = "Ainda não preparei nada pra registrar. Me diz o item, o valor, o fornecedor e se já foi pago ou é só cotação.";
      }
    }

    if (proposed.length === 0) return NextResponse.json({ reply: text });

    return NextResponse.json({
      reply: text || "Confere o resumo abaixo e confirma pra eu registrar.",
      proposal: {
        token: signProposal(ctx.householdId, ctx.userId, proposed),
        lines: proposed.map(describeAction),
      },
    });
  } catch (err) {
    console.error("ai chat", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
