import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { revertPaymentForItem, settleQuote } from "@/lib/quote-execution";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({ item_id: z.string().uuid(), delete_quote: z.boolean().optional() });

/**
 * Apaga um item (custo) da obra. Se ele veio de uma cotação aceita, volta a cotação
 * pro estado "não aceita" (pode aceitar de novo).
 */
export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { item_id, delete_quote } = parsed.data;

  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) return NextResponse.json({ error: "no_module" }, { status: 400 });

  const { data: item } = await supabase
    .from("obra_items")
    .select("id, quote_id")
    .eq("id", item_id)
    .eq("module_id", mod.id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });

  const paymentQuoteId = await revertPaymentForItem(supabase, item.id);

  const { error: delErr } = await supabase.from("obra_items").delete().eq("id", item.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (paymentQuoteId) {
    await settleQuote(supabase, paymentQuoteId);
    return NextResponse.json({ ok: true, quote_id: null, payment_quote_id: paymentQuoteId });
  }

  if (item.quote_id) {
    if (delete_quote) {
      await supabase.from("price_quotes").delete().eq("id", item.quote_id).eq("household_id", ctx.householdId);
    } else {
      await supabase
        .from("price_quotes")
        .update({ accepted_at: null, execution_started_at: null, total_amount: null })
        .eq("id", item.quote_id);
    }
  }

  return NextResponse.json({ ok: true, quote_id: delete_quote ? null : item.quote_id });
}
