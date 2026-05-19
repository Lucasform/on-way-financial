import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { extractJson } from "@/lib/utils";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  model: z.string().min(2),
  year: z.number().int().nullable().optional(),
  price: z.number().positive(),
  km_per_year: z.number().int().positive().default(15000),
  years: z.number().int().min(1).max(10).default(5),
});

const YearSchema = z.object({
  year: z.number(),
  fuel: z.number().nonnegative(),
  ipva: z.number().nonnegative(),
  insurance: z.number().nonnegative(),
  maintenance: z.number().nonnegative(),
  depreciation: z.number().nonnegative(),
  total: z.number().nonnegative(),
});
const ResponseSchema = z.object({
  summary: z.string(),
  years: z.array(YearSchema).min(1).max(10),
  total_5y: z.number().nonnegative().optional(),
});

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM = `Você é um analista automotivo brasileiro. Calcula o custo total de propriedade (TCO)
de um carro no Brasil ao longo de N anos. Sem texto extra, devolva APENAS JSON:

\`\`\`json
{
  "summary": "Análise resumida em 2-3 frases",
  "years": [
    { "year": 1, "fuel": 7200, "ipva": 3500, "insurance": 4500, "maintenance": 1200, "depreciation": 12000, "total": 28400 }
  ],
  "total_5y": 130000
}
\`\`\`

Regras:
- Use valores médios de mercado BR (2025) por categoria do carro.
- Combustível: ~10 km/l em SUVs, 13 km/l em sedans, 15 km/l em compactos; gasolina ~R$ 6,20/L.
- IPVA: ~3-4% do valor venal/ano, depreciando o valor venal.
- Seguro: 3-5% do valor/ano, depende de perfil.
- Manutenção: revisão + pneus + freios; ~R$ 1k–3k/ano dependendo da marca (premium > popular).
- Depreciação: ~12-18% ano 1, depois ~8-10% ao ano.
- "total" do ano = soma dos campos.
- "total_5y" = soma de todos os anos.`;

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const env = getServerEnv();
  const userMsg = `Carro: ${parsed.data.model}${parsed.data.year ? ` ${parsed.data.year}` : ""}
Preço pago: R$ ${parsed.data.price.toLocaleString("pt-BR")}
Quilometragem anual: ${parsed.data.km_per_year} km
Período: ${parsed.data.years} anos

Estime o custo total de propriedade ano a ano.`;

  try {
    const res = await client().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const first = res.content[0];
    if (!first || first.type !== "text") return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    const json = extractJson(first.text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch {
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    const result = ResponseSchema.safeParse(parsedJson);
    if (!result.success) return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    return NextResponse.json(result.data);
  } catch (err) {
    console.error("car-tco", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
