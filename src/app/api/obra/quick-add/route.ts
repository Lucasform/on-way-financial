import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { loadActiveContext } from "@/lib/household";
import { getObraModule } from "@/lib/obra";
import { createExpense } from "@/lib/obra-expense";
import { startExecution } from "@/lib/quote-execution";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    amount: z.number().positive().max(10_000_000),
    supplier_id: z.string().uuid().optional(),
    new_supplier_name: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["cotacao", "executada", "parcelada"]),
    payment: z
      .object({
        paid_now: z.number().min(0).max(10_000_000),
        installments: z
          .array(z.object({ label: z.string().trim().min(1).max(60), amount: z.number().positive().max(10_000_000), due_date: isoDate }))
          .min(1)
          .max(240),
      })
      .optional(),
  })
  .refine((b) => Boolean(b.supplier_id) !== Boolean(b.new_supplier_name), { message: "supplier_required" })
  .refine((b) => b.status !== "parcelada" || b.payment, { message: "payment_required" });

const ERROR_STATUS: Record<string, number> = { paid_now_out_of_range: 400, plan_sum_mismatch: 400, already_started: 409 };

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, amount, supplier_id, new_supplier_name, status, payment } = parsed.data;

  const mod = await getObraModule(ctx.householdId);
  if (!mod) return NextResponse.json({ error: "no_module" }, { status: 400 });

  const db = createSupabaseServer();
  const result = await createExpense(db, {
    householdId: ctx.householdId,
    moduleId: mod.id,
    name,
    amount,
    supplier: supplier_id ? { id: supplier_id } : { newName: new_supplier_name! },
    status: status === "parcelada" ? "cotacao" : status,
  });
  if (!result.ok) {
    const code = result.error === "supplier_not_found" ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status: code });
  }
  if (status !== "parcelada" || !payment) {
    return NextResponse.json({ ok: true, supplier: result.supplier, quote: result.quote, item: result.item });
  }

  const started = await startExecution(db, {
    householdId: ctx.householdId,
    moduleId: mod.id,
    quoteId: result.quote.id,
    quantity: 1,
    mode: "parcial",
    paid_now: payment.paid_now,
    installments: payment.installments,
  });
  if (!started.ok) {
    await db.from("price_quotes").delete().eq("id", result.quote.id);
    return NextResponse.json({ error: started.error }, { status: ERROR_STATUS[started.error] ?? 500 });
  }

  const [{ data: quote }, { data: payments }, { data: items }] = await Promise.all([
    db.from("price_quotes").select("*").eq("id", result.quote.id).single(),
    db.from("quote_payments").select("*").eq("quote_id", result.quote.id).order("due_date", { ascending: true }),
    db
      .from("obra_items")
      .select("id, name, quantity, unit, unit_price, actual_unit_price, status, bought_at")
      .eq("quote_id", result.quote.id)
      .order("created_at", { ascending: false }),
  ]);
  return NextResponse.json({
    ok: true,
    supplier: result.supplier,
    quote,
    item: items?.[0] ?? null,
    payments: payments ?? [],
    items: items ?? [],
  });
}
