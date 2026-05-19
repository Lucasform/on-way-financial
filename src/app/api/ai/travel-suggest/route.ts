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

const ActivitySchema = z.object({
  kind: z.enum(["sight", "food", "transport", "shopping", "show", "tour", "rest", "other"]).default("sight"),
  name: z.string().min(1),
  start_time: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  planned_cost: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
const ResponseSchema = z.object({ activities: z.array(ActivitySchema).min(1).max(40) });

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM = `Você é um planejador de viagens brasileiro. Recebe o pedido do usuário e gera atividades
para um itinerário de viagem. Sem texto extra, devolva APENAS JSON:

\`\`\`json
{
  "activities": [
    {
      "kind": "sight" | "food" | "transport" | "shopping" | "show" | "tour" | "rest" | "other",
      "name": "Visita ao Mosteiro dos Jerónimos",
      "start_time": "09:30",
      "location": "Belém, Lisboa",
      "planned_cost": 18.0,
      "currency": "EUR",
      "notes": "Comprar ingresso online evita fila"
    }
  ]
}
\`\`\`

Regras:
- Inclua mix realista: passeios (sight), refeições (food), transporte (transport), descanso (rest).
- Use horários e custos plausíveis pra 2025 no destino mencionado.
- Currency: use BRL pra atividades no Brasil; USD/EUR/etc para exterior.
- Máximo 30 atividades. Distribua entre os dias mencionados.
- "notes" curta com dica útil.
- Não inclua o campo "day_id" — o usuário aloca depois.`;

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (ctx.role === "viewer") return new NextResponse("forbidden", { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

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
      max_tokens: 3500,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Módulo de viagem: "${mod.name}".\n\nPedido: ${parsed.data.prompt}`,
        },
      ],
    });
    const first = res.content[0];
    if (!first || first.type !== "text") return NextResponse.json({ activities: [] });
    const json = extractJson(first.text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch {
      return NextResponse.json({ activities: [] });
    }
    const result = ResponseSchema.safeParse(parsedJson);
    if (!result.success) return NextResponse.json({ activities: [] });
    return NextResponse.json({ activities: result.data.activities });
  } catch (err) {
    console.error("travel suggest", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
