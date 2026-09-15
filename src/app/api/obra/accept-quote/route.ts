import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  quote_id: z.string().uuid(),
  quantity: z.number().positive().max(1_000_000),
  phase_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { quote_id, quantity, phase_id } = parsed.data;

  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) return NextResponse.json({ error: "no_module" }, { status: 400 });

  // Update atômico: só "reivindica" a cotação se ainda não tiver sido aceita, evitando
  // aceitar 2x (clique duplo, ou 2 abas) virar 2 compras + 2 despesas.
  const { data: quote, error: claimErr } = await supabase
    .from("price_quotes")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", quote_id)
    .eq("household_id", ctx.householdId)
    .is("accepted_at", null)
    .select("*")
    .maybeSingle();
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });
  if (!quote) {
    const { data: existing } = await supabase
      .from("price_quotes")
      .select("id")
      .eq("id", quote_id)
      .eq("household_id", ctx.householdId)
      .maybeSingle();
    return NextResponse.json(
      { error: existing ? "already_accepted" : "quote_not_found" },
      { status: existing ? 409 : 404 },
    );
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("name, category")
    .eq("id", quote.supplier_id)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const total = quantity * Number(quote.unit_price);

  // Se algo falhar daqui pra frente, desfaz o "aceite" pra cotação não ficar travada sem nada criado.
  async function unclaim() {
    await supabase.from("price_quotes").update({ accepted_at: null }).eq("id", quote_id);
  }

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      household_id: ctx.householdId,
      type: "expense",
      amount: total,
      description: quote.item_name,
      occurred_at: today,
      module_id: mod.id,
      module_kind: "obra",
      supplier: supplier?.name ?? null,
      source: "web",
      created_by: ctx.userId,
    })
    .select("*")
    .single();
  if (txErr || !tx) {
    await unclaim();
    return NextResponse.json({ error: txErr?.message ?? "transaction_failed" }, { status: 500 });
  }

  const { data: item, error: itemErr } = await supabase
    .from("obra_items")
    .insert({
      module_id: mod.id,
      phase_id: phase_id ?? null,
      category: supplier?.category ?? "material",
      name: quote.item_name,
      brand: null,
      supplier: supplier?.name ?? null,
      supplier_id: quote.supplier_id,
      material_type_id: quote.material_type_id,
      unit: quote.unit,
      quantity,
      unit_price: quote.unit_price,
      actual_unit_price: quote.unit_price,
      status: "bought",
      bought_at: today,
      quote_id: quote.id,
      transaction_id: tx.id,
      notes: `Aceito da cotação de ${quote.quoted_at}`,
    })
    .select("*")
    .single();
  if (itemErr || !item) {
    await supabase.from("transactions").delete().eq("id", tx.id);
    await unclaim();
    return NextResponse.json({ error: itemErr?.message ?? "item_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item, transaction: tx });
}
