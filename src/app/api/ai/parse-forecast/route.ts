import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";
import { extractJson } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({ text: z.string().min(1).max(60_000) });

const ItemSchema = z.object({
  category: z.enum(["material", "mão-de-obra", "equipamento", "serviço", "outro"]).default("material"),
  name: z.string().min(1).max(200),
  planned_value: z.number().positive(),
  notes: z.string().nullable().optional(),
});

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM_PROMPT = `Você organiza planilhas de previsão de gastos de obra (vindas de banco ou de
qualquer fonte) em linhas estruturadas. Recebe o texto bruto (CSV/linhas de planilha) e devolve
APENAS um JSON, sem texto extra:

\`\`\`json
{
  "items": [
    {
      "category": "material" | "mão-de-obra" | "equipamento" | "serviço" | "outro",
      "name": "descrição curta do item/linha (até 80 chars)",
      "planned_value": número positivo (valor previsto em reais),
      "notes": string curta com info relevante que você julgar (fornecedor, data, observação) ou null
    }
  ]
}
\`\`\`

Regras:
- Uma linha da planilha vira um item. Ignore cabeçalhos, totais/subtotais, linhas vazias.
- Se a planilha já tiver uma coluna de categoria/tipo, use-a pra escolher a category mais próxima.
- Se não houver categoria explícita, infira pelo nome/descrição (ex: "pedreiro" = mão-de-obra,
  "cimento" = material, "aluguel de betoneira" = equipamento).
- Valores: sempre positivos, em reais (converta "R$ 1.234,56" para 1234.56).
- Se houver muitas linhas (>80), inclua TODAS.`;

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const env = getServerEnv();
  try {
    const res = await client().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: parsed.data.text.slice(0, 50_000) }],
    });
    const first = res.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!first) return NextResponse.json({ items: [] });

    const json = extractJson(first.text);
    const obj = JSON.parse(json) as { items?: unknown };
    if (!Array.isArray(obj.items)) return NextResponse.json({ items: [] });

    const items = obj.items
      .map((it) => ItemSchema.safeParse(it))
      .filter((r): r is { success: true; data: z.infer<typeof ItemSchema> } => r.success)
      .map((r) => r.data);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("parse-forecast", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
