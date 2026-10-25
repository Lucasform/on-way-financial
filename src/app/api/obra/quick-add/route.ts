import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { todayISO } from "@/lib/dates";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(10_000_000),
  supplier_id: z.string().uuid(),
  status: z.enum(["cotacao", "executada"]),
});

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, amount, supplier_id, status } = parsed.data;

  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) return NextResponse.json({ error: "no_module" }, { status: 400 });

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("name")
    .eq("id", supplier_id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (!supplier) return NextResponse.json({ error: "supplier_not_found" }, { status: 404 });

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
    return NextResponse.json({ ok: true, quote, item: null });
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

  return NextResponse.json({ ok: true, quote, item });
}
