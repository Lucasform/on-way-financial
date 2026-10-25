import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  ADD_CHECKLIST_ITEM_TOOL,
  ADD_MATERIAL_TOOL,
  ADD_QUOTE_TOOL,
  ADD_SUPPLIER_TOOL,
  addChecklistItem,
  addMaterialItem,
  addQuote,
  addSupplier,
  ASSISTANT_SYSTEM,
  buildFinancialContext,
  SEARCH_COSTS_TOOL,
  searchCosts,
} from "@/lib/ai/context";
import { createCostFromIntent } from "@/lib/ai/create-transaction";
import { ParsedSchema, parseCommand, parseFreeText, type ParsedIntent } from "@/lib/ai/parser";
import { extractTransactionsFromText } from "@/lib/import/ai-extract";
import { formatBRL } from "@/lib/money";
import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";
export const maxDuration = 30;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
  pending: ParsedSchema.nullable().optional(),
});

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

  const env = getServerEnv();
  const last = parsed.data.messages[parsed.data.messages.length - 1];
  const userText = last?.role === "user" ? last.content.trim() : "";

  // Fase 0: detectar lote de transacoes (mensagem multilinha)
  if (last && last.role === "user" && looksLikeBatch(last.content)) {
    try {
      const { rows } = await extractTransactionsFromText(last.content);
      if (rows.length >= 2) {
        let created = 0;
        let total = 0;
        const failures: string[] = [];
        for (const r of rows) {
          if (r.type === "income") {
            failures.push(r.description);
            continue;
          }
          const intent: ParsedIntent = {
            intent: "expense",
            amount: r.amount,
            description: r.description,
            category_hint: r.category_hint ?? null,
            payment_hint: (r.payment_hint === "other" ? null : r.payment_hint) ?? null,
            occurred_at: r.occurred_at,
            module_hint: null,
            confidence: 1,
          };
          const res = await createCostFromIntent({ householdId: ctx.householdId, intent });
          if (res.ok) {
            created++;
            total += r.amount;
          } else {
            failures.push(r.description);
          }
        }
        const reply =
          `✅ ${created} custo${created === 1 ? "" : "s"} registrado${created === 1 ? "" : "s"}. Total: ${formatBRL(total)}.` +
          (failures.length > 0 ? `\n\n⚠️ ${failures.length} não foi(ram) salvo(s): ${failures.slice(0, 3).join(", ")}` : "");
        return NextResponse.json({ reply });
      }
    } catch (e) {
      console.error("ai chat batch", e);
    }
  }

  // Fase 1: detectar nova transação
  if (last && last.role === "user") {
    try {
      let intent: ParsedIntent | null = null;
      const cmd = parseCommand(last.content);
      if (cmd && "intent" in cmd && (cmd.intent === "expense" || cmd.intent === "income")) {
        intent = cmd;
      } else if (looksLikeTransaction(last.content) && looksLikeQuote(last.content)) {
        // Ambíguo: tem cara de preço mas também de cotação recebida (não pago ainda).
        // Não lança nada sozinho — pergunta antes.
        return NextResponse.json({
          reply:
            "Isso é uma despesa que você já pagou, ou uma cotação/orçamento que te passaram (ainda não pago)? " +
            "Me confirma que eu registro certinho.",
        });
      } else if (looksLikeTransaction(last.content)) {
        const free = await parseFreeText(last.content);
        if (
          (free.intent === "expense" || free.intent === "income") &&
          free.amount != null &&
          free.confidence >= 0.5
        ) {
          intent = free;
        }
      }

      if (intent) {
        const r = await createCostFromIntent({ householdId: ctx.householdId, intent });
        return NextResponse.json({ reply: r.reply });
      }
    } catch (e) {
      console.error("ai chat intent detect", e);
    }
  }

  // Q&A normal
  const financialContext = await buildFinancialContext({ householdId: ctx.householdId });
  const system = `${ASSISTANT_SYSTEM}\n\n--- FINANCIAL CONTEXT ---\n${financialContext}`;

  try {
    const history: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const tools = [SEARCH_COSTS_TOOL, ADD_SUPPLIER_TOOL, ADD_QUOTE_TOOL, ADD_MATERIAL_TOOL, ADD_CHECKLIST_ITEM_TOOL];

    let res = await client().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 800,
      system,
      messages: history,
      tools,
    });

    // Se a IA pediu pra usar uma ferramenta, executa e devolve o resultado pra ela terminar a resposta.
    let rounds = 0;
    while (res.stop_reason === "tool_use" && rounds < 3) {
      rounds++;
      const toolUse = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!toolUse) break;
      let result: string;
      if (toolUse.name === "search_costs") {
        result = await searchCosts(ctx.householdId, toolUse.input as Record<string, string>);
      } else if (toolUse.name === "add_supplier") {
        result = await addSupplier(ctx.householdId, toolUse.input as { name: string });
      } else if (toolUse.name === "add_quote") {
        result = await addQuote(ctx.householdId, toolUse.input as { supplier_name: string; item_name: string; unit_price: number });
      } else if (toolUse.name === "add_material_item") {
        result = await addMaterialItem(ctx.householdId, toolUse.input as { name: string });
      } else if (toolUse.name === "add_checklist_item") {
        result = await addChecklistItem(ctx.householdId, toolUse.input as { phase_name: string; name: string });
      } else {
        result = "Ferramenta desconhecida.";
      }

      history.push({ role: "assistant", content: res.content });
      history.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: result }],
      });

      res = await client().messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 800,
        system,
        messages: history,
        tools,
      });
    }

    const first = res.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return NextResponse.json({ reply: first?.text ?? "" });
  } catch (err) {
    console.error("ai chat", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}

function looksLikeBatch(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return false;
  // Conta linhas com numero (provavel valor)
  const withNumber = lines.filter((l) => /\d/.test(l)).length;
  return withNumber >= 2;
}

function looksLikeTransaction(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\d/.test(t)) return false;
  const verbs = [
    "gastei", "gasto", "paguei", "comprei", "compra", "torrei",
    "recebi", "receita", "ganhei", "salário", "salario",
    "despesa", "investi", "transferi", "saquei",
    "r$", "reais", "real",
  ];
  return verbs.some((v) => t.includes(v));
}

function looksLikeQuote(text: string): boolean {
  const t = text.toLowerCase();
  const phrases = [
    "cotou", "cotação", "cotacao", "orçou", "orçamento", "orcamento",
    "passou o preço", "passou preço", "passou o preco", "passou preco",
    "vai cobrar", "vai custar", "cobra", "cobram",
    "informou o preço", "informou preço", "informou o preco", "informou preco",
    "disse que custa", "falou que custa", "preço de", "preco de",
  ];
  return phrases.some((p) => t.includes(p));
}
