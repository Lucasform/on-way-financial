import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";

export const QuoteEstimate = z.object({
  min: z.number().nonnegative(),
  avg: z.number().nonnegative(),
  max: z.number().nonnegative(),
  unit: z.string(),
  notes: z.string(),
});
export type QuoteEstimate = z.infer<typeof QuoteEstimate>;

const SYSTEM = `Você estima preços de mercado no Brasil (BRL) para itens de obra, viagem,
veículos, educação e compras em geral. Dê uma faixa realista (mínimo, médio, máximo)
com base em conhecimento de mercado brasileiro. Sempre via ferramenta estimate_price.
Inclua a unidade (ex: "por saco 50kg", "por m²", "por diária", "unidade") e uma nota
curta com premissas. Deixe claro que é estimativa, não cotação ao vivo.`;

const TOOL: Anthropic.Tool = {
  name: "estimate_price",
  description: "Estimativa de faixa de preço de mercado (BRL).",
  input_schema: {
    type: "object",
    properties: {
      min: { type: "number" },
      avg: { type: "number" },
      max: { type: "number" },
      unit: { type: "string" },
      notes: { type: "string" },
    },
    required: ["min", "avg", "max", "unit", "notes"],
  },
};

export async function estimateQuote(item: string, context?: string): Promise<QuoteEstimate | null> {
  const env = getServerEnv();
  if (!env.anthropicKey) throw new Error("ANTHROPIC_API_KEY ausente");
  const client = new Anthropic({ apiKey: env.anthropicKey });

  const res = await client.messages.create({
    model: env.aiParseModel,
    max_tokens: 600,
    system: SYSTEM,
    tool_choice: { type: "tool", name: "estimate_price" },
    tools: [TOOL],
    messages: [
      {
        role: "user",
        content: `Item: ${item}${context ? `\nContexto: ${context}` : ""}\nEstime a faixa de preço no Brasil hoje.`,
      },
    ],
  });

  const block = res.content.find((c) => c.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  const parsed = QuoteEstimate.safeParse(block.input);
  return parsed.success ? parsed.data : null;
}
