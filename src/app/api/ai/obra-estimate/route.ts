import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { extractJson } from "@/lib/utils";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  module_id: z.string().uuid(),
  prompt: z.string().min(5).max(2000),
});

const ItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["material", "mão-de-obra", "equipamento", "serviço"]).default("material"),
  unit: z.string().default("un"),
  quantity: z.number().positive().default(1),
  unit_price: z.number().positive().nullable().optional(),
  brand: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  phase_hint: z.string().nullable().optional(),
});
const ResponseSchema = z.object({ items: z.array(ItemSchema).min(1).max(40) });

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM = `Você é um engenheiro civil brasileiro que ajuda famílias a planejarem obras residenciais.
Recebe uma descrição curta do que precisa estimar e devolve uma LISTA DETALHADA de materiais/serviços
com quantidade, unidade e preço aproximado (em BRL, valores de 2025 no Brasil).

Devolva APENAS um JSON neste formato:
\`\`\`json
{
  "items": [
    {
      "name": "Cimento CP-II 50kg",
      "category": "material",
      "unit": "saco",
      "quantity": 12,
      "unit_price": 35.0,
      "brand": "Votoran",
      "supplier": null,
      "notes": "consumo médio: 0.15 saco por m² de chapisco",
      "phase_hint": "Estrutura"
    }
  ]
}
\`\`\`

Regras:
- Use unidades reais: un, m, m2, m3, kg, saco, litro, rolo, barra, caixa, hora, diária.
- Categorias: material, mão-de-obra, equipamento, serviço.
- Preços médios de varejo brasileiro (Leroy Merlin, C&C, Telhanorte). Sem garantia, é estimativa.
- Inclua mão-de-obra quando relevante (servente, pedreiro, eletricista) com unit="diária" e quantity=dias estimados.
- Seja completo: pra "rebocar parede" inclua cimento, areia, água, fita crepe, andaime, mão-de-obra.
- "notes" curtas explicando o cálculo quando útil.
- Máximo 30 itens.`;

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (ctx.role === "viewer") return new NextResponse("forbidden", { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Validar que o módulo pertence ao household
  const admin = createSupabaseAdmin();
  const { data: mod } = await admin
    .from("modules")
    .select("id, name, household_id")
    .eq("id", parsed.data.module_id)
    .single();
  if (!mod || mod.household_id !== ctx.householdId) return new NextResponse("not_found", { status: 404 });

  const env = getServerEnv();
  try {
    const res = await client().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Módulo de obra: "${mod.name}".\n\nPedido: ${parsed.data.prompt}`,
        },
      ],
    });
    const first = res.content[0];
    if (!first || first.type !== "text") return NextResponse.json({ items: [] });
    const json = extractJson(first.text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch {
      return NextResponse.json({ items: [] });
    }
    const result = ResponseSchema.safeParse(parsedJson);
    if (!result.success) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: result.data.items });
  } catch (err) {
    console.error("obra estimate", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
