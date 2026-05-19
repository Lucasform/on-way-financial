import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { extractJson } from "@/lib/utils";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  recipient: z.string().min(1).max(100),
  occasion: z.string().max(100).optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  interests: z.string().max(500).optional(),
  budget: z.number().positive().optional(),
});

const IdeaSchema = z.object({
  idea: z.string().min(2),
  why: z.string().min(2),
  approx_price: z.number().positive().nullable().optional(),
  where_to_buy: z.string().nullable().optional(),
});
const ResponseSchema = z.object({ ideas: z.array(IdeaSchema).min(1).max(8) });

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM = `Você sugere presentes pra pessoas no Brasil. Recebe perfil do destinatário e
devolve 5-8 ideias variadas (não só uma categoria), com motivo curto, preço aproximado
em BRL, e onde costuma vender. Devolva APENAS JSON:

\`\`\`json
{
  "ideas": [
    {
      "idea": "Headphone Bluetooth JBL Tune 510BT",
      "why": "Bom som, bateria longa, faixa de preço acessível",
      "approx_price": 280,
      "where_to_buy": "Amazon, Magazine Luiza"
    }
  ]
}
\`\`\`

Regras:
- Considere idade, ocasião, interesses, orçamento se fornecidos.
- Misture categorias: tecnologia, experiência, livro, hobby, beleza, casa, viagem.
- Preços médios de varejo BR 2025.
- Sem links (texto livre em "where_to_buy").
- Português brasileiro.`;

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const env = getServerEnv();
  const userMsg = [
    `Destinatário: ${parsed.data.recipient}`,
    parsed.data.age != null && `Idade: ${parsed.data.age} anos`,
    parsed.data.occasion && `Ocasião: ${parsed.data.occasion}`,
    parsed.data.interests && `Interesses: ${parsed.data.interests}`,
    parsed.data.budget && `Orçamento: até R$ ${parsed.data.budget.toFixed(2)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await client().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const first = res.content[0];
    if (!first || first.type !== "text") return NextResponse.json({ ideas: [] });
    const json = extractJson(first.text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch {
      return NextResponse.json({ ideas: [] });
    }
    const result = ResponseSchema.safeParse(parsedJson);
    if (!result.success) return NextResponse.json({ ideas: [] });
    return NextResponse.json(result.data);
  } catch (err) {
    console.error("gift suggest", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
