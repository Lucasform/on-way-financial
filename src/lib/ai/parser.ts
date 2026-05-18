import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { buildParserSystemPrompt } from "@/lib/ai/prompts";
import { getServerEnv } from "@/lib/env";
import { parseRelativeDatePt, todayISO } from "@/lib/dates";
import { parseBRL } from "@/lib/money";
import { extractJson } from "@/lib/utils";

export const ParsedSchema = z.object({
  intent: z.enum(["expense", "income", "query_balance", "unknown"]),
  amount: z.number().positive().nullable(),
  description: z.string().nullable(),
  category_hint: z.string().nullable(),
  payment_hint: z
    .enum(["cash", "pix", "debit_card", "credit_card", "bank_transfer", "boleto", "meal_voucher"])
    .nullable(),
  occurred_at: z.string().nullable(),
  module_hint: z.enum(["obra", "travel", "car", "gift", "education"]).nullable(),
  confidence: z.number().min(0).max(1),
});
export type ParsedIntent = z.infer<typeof ParsedSchema>;

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const env = getServerEnv();
  _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Parser determinístico para comandos `/...`. Retorna null se a string não é um comando.
 */
export function parseCommand(text: string): ParsedIntent | { command: string; rest: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [head, ...rest] = trimmed.slice(1).split(/\s+/);
  const command = (head ?? "").toLowerCase();
  const restStr = rest.join(" ");
  if (!command) return null;

  if (["despesa", "receita", "obra", "viagem"].includes(command)) {
    return parseTxCommand(command, restStr);
  }

  return { command, rest: restStr };
}

function parseTxCommand(command: string, rest: string): ParsedIntent {
  // formato: <valor> <descrição> [#categoria] [@método] [data?]
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return baseUnknown();
  }
  const first = tokens[0]!;
  const amount = parseBRL(first);
  if (amount == null) return baseUnknown();

  let category: string | null = null;
  let paymentHint: ParsedIntent["payment_hint"] = null;
  let dateHint: string | null = null;
  const descTokens: string[] = [];

  for (const t of tokens.slice(1)) {
    if (t.startsWith("#")) {
      category = t.slice(1);
    } else if (t.startsWith("@")) {
      paymentHint = mapPaymentHint(t.slice(1));
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(t) || /^\d{2}\/\d{2}\/\d{4}$/.test(t)) {
      dateHint = parseRelativeDatePt(t);
    } else if (["hoje", "ontem", "anteontem"].includes(t.toLowerCase())) {
      dateHint = parseRelativeDatePt(t);
    } else {
      descTokens.push(t);
    }
  }

  const description = descTokens.join(" ") || null;

  return {
    intent: command === "receita" ? "income" : "expense",
    amount,
    description,
    category_hint: category,
    payment_hint: paymentHint,
    occurred_at: dateHint ?? todayISO(),
    module_hint: command === "obra" ? "obra" : command === "viagem" ? "travel" : null,
    confidence: 1,
  };
}

function mapPaymentHint(raw: string): ParsedIntent["payment_hint"] {
  const v = raw.toLowerCase();
  if (v === "pix") return "pix";
  if (["debito", "débito"].includes(v)) return "debit_card";
  if (["credito", "crédito", "cartao", "cartão"].includes(v)) return "credit_card";
  if (["dinheiro", "cash"].includes(v)) return "cash";
  if (["ted", "transferencia", "transferência"].includes(v)) return "bank_transfer";
  if (v === "boleto") return "boleto";
  if (["vr", "va", "vale", "vale-refeicao", "vale-refeição"].includes(v)) return "meal_voucher";
  return null;
}

function baseUnknown(): ParsedIntent {
  return {
    intent: "unknown",
    amount: null,
    description: null,
    category_hint: null,
    payment_hint: null,
    occurred_at: null,
    module_hint: null,
    confidence: 0,
  };
}

/**
 * Parser via Claude API para texto livre.
 */
export async function parseFreeText(text: string): Promise<ParsedIntent> {
  const env = getServerEnv();
  const response = await client().messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 400,
    system: buildParserSystemPrompt(),
    messages: [{ role: "user", content: text }],
  });

  const first = response.content[0];
  if (!first || first.type !== "text") {
    return baseUnknown();
  }
  const jsonText = extractJson(first.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return baseUnknown();
  }
  const result = ParsedSchema.safeParse(parsed);
  if (!result.success) return baseUnknown();
  return result.data;
}
