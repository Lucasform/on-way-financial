import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { extractJson } from "@/lib/utils";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  topic: z.string().min(2).max(200),
  current_provider: z.string().nullable().optional(),
  current_cost: z.number().positive().nullable().optional(),
});

const SuggestionSchema = z.object({
  title: z.string(),
  provider: z.string(),
  type: z.enum(["online", "presencial", "híbrido"]).default("online"),
  monthly_cost: z.number().nonnegative().nullable().optional(),
  pros: z.string(),
  cons: z.string().nullable().optional(),
});
const ResponseSchema = z.object({
  comparison: z.string(),
  options: z.array(SuggestionSchema).min(2).max(6),
});

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM = `Você é um conselheiro educacional brasileiro. Recebe o tópico de estudo (ex: "Inglês infantil",
"Programação Python adulto", "Música pra adolescente") e devolve 3-5 opções comparáveis com preços
médios do mercado BR (2025). Sem texto extra, devolva APENAS JSON:

\`\`\`json
{
  "comparison": "Resumo em 1-2 frases sobre o cenário do tópico",
  "options": [
    {
      "title": "Inglês — Cultura Inglesa",
      "provider": "Cultura Inglesa",
      "type": "presencial",
      "monthly_cost": 850,
      "pros": "Tradição, material próprio, certificação Cambridge",
      "cons": "Caro, presença obrigatória"
    }
  ]
}
\`\`\`

Regras:
- Mistura presencial e online quando relevante.
- Preços médios do varejo BR 2025.
- "pros" e "cons" curtos (1 frase cada).
- Considere alternativas free/baratas (YouTube, Duolingo, apps) quando fizer sentido.`;

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const env = getServerEnv();
  const userMsg = [
    `Tópico: ${parsed.data.topic}`,
    parsed.data.current_provider && `Atualmente em: ${parsed.data.current_provider}`,
    parsed.data.current_cost && `Pagando: R$ ${parsed.data.current_cost.toFixed(2)}/mês`,
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
    if (!first || first.type !== "text") return NextResponse.json({ options: [] });
    const json = extractJson(first.text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch {
      return NextResponse.json({ options: [] });
    }
    const result = ResponseSchema.safeParse(parsedJson);
    if (!result.success) return NextResponse.json({ options: [] });
    return NextResponse.json(result.data);
  } catch (err) {
    console.error("edu suggest", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
