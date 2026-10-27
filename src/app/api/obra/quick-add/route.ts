import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { todayISO } from "@/lib/dates";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    amount: z.number().positive().max(10_000_000),
    supplier_id: z.string().uuid().optional(),
    new_supplier_name: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["cotacao", "executada"]),
  })
  .refine((b) => Boolean(b.supplier_id) !== Boolean(b.new_supplier_name), { message: "supplier_required" });

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, amount, new_supplier_name, status } = parsed.data;

  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) return NextResponse.json({ error: "no_module" }, { status: 400 });

  let supplier: { id: string; name: string } | null = null;
  if (new_supplier_name) {
    const { data: existing } = await supabase.from("suppliers").select("id, name").eq("household_id", ctx.householdId);
    const wanted = normalizeName(new_supplier_name);
    supplier = (existing ?? []).find((s) => normalizeName(s.name) === wanted) ?? null;
    if (!supplier) {
      const { data: created, error: supErr } = await supabase
        .from("suppliers")
        .insert({ household_id: ctx.householdId, name: new_supplier_name, category: "material" })
        .select("id, name")
        .single();
      if (supErr || !created) return NextResponse.json({ error: supErr?.message ?? "supplier_failed" }, { status: 500 });
      supplier = created;
    }
  } else {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", parsed.data.supplier_id!)
      .eq("household_id", ctx.householdId)
      .maybeSingle();
    supplier = data;
  }
  if (!supplier) return NextResponse.json({ error: "supplier_not_found" }, { status: 404 });
  const supplier_id = supplier.id;

  const executed = status === "executada";
  const today = todayISO();

  const { data: quote, error: quoteErr } = await supabase
    .from("price_quotes")
    .insert({
      household_id: ctx.householdId,
      supplier_id,
      item_name: name,
      unit: "un",
      unit_price: amount,
      quoted_at: today,
      accepted_at: executed ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (quoteErr || !quote) return NextResponse.json({ error: quoteErr?.message ?? "quote_failed" }, { status: 500 });

  if (!executed) {
    return NextResponse.json({ ok: true, supplier, quote, item: null });
  }

  const { data: item, error: itemErr } = await supabase
    .from("obra_items")
    .insert({
      module_id: mod.id,
      category: "material",
      name,
      supplier: supplier.name,
      supplier_id,
      unit: "un",
      quantity: 1,
      unit_price: amount,
      actual_unit_price: amount,
      status: "done",
      bought_at: today,
      quote_id: quote.id,
    })
    .select("*")
    .single();
  if (itemErr || !item) {
    await supabase.from("price_quotes").delete().eq("id", quote.id);
    return NextResponse.json({ error: itemErr?.message ?? "item_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, supplier, quote, item });
}
