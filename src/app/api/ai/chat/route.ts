import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { ASSISTANT_SYSTEM, buildFinancialContext } from "@/lib/ai/context";
import { createTransactionFromIntent } from "@/lib/ai/create-transaction";
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

  // Fase 2: usuário respondendo se a transação pendente é de algum módulo
  if (parsed.data.pending && userText) {
    const pending = parsed.data.pending;
    if (/^(n[ãa]o|nao|n|nenhum|sem|skip|pula|nada)$/i.test(userText)) {
      const r = await createTransactionFromIntent({
        householdId: ctx.householdId,
        userId: ctx.userId,
        intent: pending,
        moduleOverride: null,
        origin: "ai_chat",
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
        origin: "ai_chat",
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

  // Fase 0: detectar lote de transacoes (mensagem multilinha)
  if (last && last.role === "user" && looksLikeBatch(last.content)) {
    try {
      const { rows } = await extractTransactionsFromText(last.content);
      if (rows.length >= 2) {
        const moduleHint = detectBatchModule(last.content, ctx.activeModules);
        let created = 0;
        let total = 0;
        const failures: string[] = [];
        for (const r of rows) {
          const intent: ParsedIntent = {
            intent: r.type === "income" ? "income" : "expense",
            amount: r.amount,
            description: r.description,
            category_hint: r.category_hint ?? null,
            payment_hint: (r.payment_hint === "other" ? null : r.payment_hint) ?? null,
            occurred_at: r.occurred_at,
            module_hint: null,
            confidence: 1,
          };
          const res = await createTransactionFromIntent({
            householdId: ctx.householdId,
            userId: ctx.userId,
            intent,
            moduleOverride: moduleHint ? { id: moduleHint.id, kind: moduleHint.kind } : null,
            origin: "ai_chat",
          });
          if (res.ok) {
            created++;
            total += r.amount;
          } else {
            failures.push(r.description);
          }
        }
        const moduleLabel = moduleHint ? ` no módulo ${moduleHint.name}` : "";
        const reply =
          `✅ ${created} transação${created === 1 ? "" : "ões"} registrada${created === 1 ? "" : "s"}${moduleLabel}. Total: ${formatBRL(total)}.` +
          (failures.length > 0 ? `\n\n⚠️ ${failures.length} não foi(ram) salvas: ${failures.slice(0, 3).join(", ")}` : "");
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
        // Mencionou módulo → cria direto
        if (intent.module_hint) {
          const r = await createTransactionFromIntent({
            householdId: ctx.householdId,
            userId: ctx.userId,
            intent,
            origin: "ai_chat",
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
          origin: "ai_chat",
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

function looksLikeBatch(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return false;
  // Conta linhas com numero (provavel valor)
  const withNumber = lines.filter((l) => /\d/.test(l)).length;
  return withNumber >= 2;
}

function detectBatchModule(
  text: string,
  mods: { id: string; kind: string; name: string }[],
): { id: string; kind: string; name: string } | null {
  if (mods.length === 0) return null;
  const t = text.toLowerCase();
  // Tenta casar pelo nome do modulo
  for (const m of mods) {
    if (t.includes(m.name.toLowerCase())) return m;
  }
  // Tenta casar pelo kind
  const kindKw: Record<string, string> = {
    obra: "obra",
    viagem: "travel",
    carro: "car",
    presente: "gift",
    educação: "education",
    educacao: "education",
  };
  for (const [kw, kind] of Object.entries(kindKw)) {
    if (t.includes(kw)) {
      const found = mods.find((x) => x.kind === kind);
      if (found) return found;
    }
  }
  return null;
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
