import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { ASSISTANT_SYSTEM, buildFinancialContext } from "@/lib/ai/context";
import { createTransactionFromIntent } from "@/lib/ai/create-transaction";
import { ParsedSchema, parseCommand, parseFreeText, type ParsedIntent } from "@/lib/ai/parser";
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

  // Fase 2: usuário respondendo se a transação pendente é de algum módulo
  if (parsed.data.pending && userText) {
    const pending = parsed.data.pending;
    if (/^(n[ãa]o|nao|n|nenhum|sem|skip|pula|nada)$/i.test(userText)) {
      const r = await createTransactionFromIntent({
        householdId: ctx.householdId,
        userId: ctx.userId,
        intent: pending,
        moduleOverride: null,
      });
      return NextResponse.json({ reply: r.reply });
    }
    const matched = matchModule(userText, ctx.activeModules);
    if (matched) {
      const r = await createTransactionFromIntent({
        householdId: ctx.householdId,
        userId: ctx.userId,
        intent: pending,
        moduleOverride: { id: matched.id, kind: matched.kind },
      });
      return NextResponse.json({ reply: r.reply });
    }
    return NextResponse.json({
      reply: `Não achei módulo com esse nome. Tenta um destes: ${ctx.activeModules
        .map((m) => m.name)
        .join(", ")} — ou responda "não" para criar sem vincular.`,
      pending,
    });
  }

  // Fase 1: detectar nova transação
  if (last && last.role === "user") {
    try {
      let intent: ParsedIntent | null = null;
      const cmd = parseCommand(last.content);
      if (cmd && "intent" in cmd && (cmd.intent === "expense" || cmd.intent === "income")) {
        intent = cmd;
      } else if (looksLikeTransaction(last.content)) {
        const free = await parseFreeText(last.content);
        if (
          (free.intent === "expense" || free.intent === "income") &&
          free.amount != null &&
          free.confidence >= 0.65
        ) {
          intent = free;
        }
      }

      if (intent) {
        // Mencionou módulo → cria direto
        if (intent.module_hint) {
          const r = await createTransactionFromIntent({
            householdId: ctx.householdId,
            userId: ctx.userId,
            intent,
          });
          return NextResponse.json({ reply: r.reply });
        }
        // Sem módulo na mensagem + tem módulos ativos → pergunta
        if (ctx.activeModules.length > 0) {
          const list = ctx.activeModules.map((m) => m.name).join(", ");
          return NextResponse.json({
            reply: `Entendi a ${intent.intent === "income" ? "receita" : "despesa"}. Quer vincular a algum módulo ativo?\n\n${list}\n\nResponda o nome ou "não" para criar sem vincular.`,
            pending: intent,
          });
        }
        // Sem módulos → cria direto sem vincular
        const r = await createTransactionFromIntent({
          householdId: ctx.householdId,
          userId: ctx.userId,
          intent,
          moduleOverride: null,
        });
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
    const res = await client().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 800,
      system,
      messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const first = res.content[0];
    const text = first && first.type === "text" ? first.text : "";
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("ai chat", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
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

function matchModule(
  text: string,
  mods: { id: string; kind: string; name: string }[],
): { id: string; kind: string } | null {
  const t = text.toLowerCase().trim();
  let m = mods.find((x) => x.name.toLowerCase() === t);
  if (m) return { id: m.id, kind: m.kind };
  m = mods.find((x) => x.name.toLowerCase().includes(t) || t.includes(x.name.toLowerCase()));
  if (m) return { id: m.id, kind: m.kind };
  const kindKw: Record<string, string> = {
    obra: "obra", obras: "obra",
    viagem: "travel", viagens: "travel", travel: "travel",
    carro: "car", car: "car", veículo: "car", veiculo: "car",
    presente: "gift", presentes: "gift", gift: "gift",
    educação: "education", educacao: "education", education: "education", estudo: "education", curso: "education",
  };
  for (const [kw, kind] of Object.entries(kindKw)) {
    if (t.includes(kw)) {
      const found = mods.find((x) => x.kind === kind);
      if (found) return { id: found.id, kind: found.kind };
    }
  }
  return null;
}
