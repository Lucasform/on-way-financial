import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";

export const ParsedExpense = z.object({
  type: z.enum(["income", "expense", "transfer"]).default("expense"),
  amount: z.number().nonnegative(),
  description: z.string(),
  category_hint: z.string().nullable().default(null),
  occurred_on: z.string().nullable().default(null), // YYYY-MM-DD
  account_hint: z.string().nullable().default(null),
  project_hint: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type ParsedExpense = z.infer<typeof ParsedExpense>;

const SYSTEM = `Você extrai lançamentos financeiros de mensagens em português do Brasil.
Responda APENAS com uma chamada da ferramenta record_expense.
Regras:
- "gastei", "paguei", "comprei" => expense. "recebi", "entrou", "salário" => income.
- amount em número (ponto decimal). Interprete "1,2k"=1200, "50 reais"=50.
- occurred_on no formato YYYY-MM-DD quando houver data relativa (hoje/ontem); senão null.
- category_hint: categoria provável (ex: Mercado, Transporte, Obra, Lazer).
- project_hint: nome da obra se a mensagem citar construção/reforma.
- confidence entre 0 e 1.`;

const TOOL: Anthropic.Tool = {
  name: "record_expense",
  description: "Registra um lançamento financeiro extraído da mensagem.",
  input_schema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["income", "expense", "transfer"] },
      amount: { type: "number" },
      description: { type: "string" },
      category_hint: { type: ["string", "null"] },
      occurred_on: { type: ["string", "null"] },
      account_hint: { type: ["string", "null"] },
      project_hint: { type: ["string", "null"] },
      confidence: { type: "number" },
    },
    required: ["type", "amount", "description", "confidence"],
  },
};

export async function parseExpense(
  message: string,
  today: string,
): Promise<ParsedExpense | null> {
  const env = getServerEnv();
  if (!env.anthropicKey) throw new Error("ANTHROPIC_API_KEY ausente");

  const client = new Anthropic({ apiKey: env.anthropicKey });
  const res = await client.messages.create({
    model: env.aiParseModel,
    max_tokens: 512,
    system: SYSTEM,
    tool_choice: { type: "tool", name: "record_expense" },
    tools: [TOOL],
    messages: [{ role: "user", content: `Hoje é ${today}.\nMensagem: ${message}` }],
  });

  const block = res.content.find((c) => c.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;

  const parsed = ParsedExpense.safeParse(block.input);
  return parsed.success ? parsed.data : null;
}
