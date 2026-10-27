import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadActiveContext } from "@/lib/household";
import { getObraModule } from "@/lib/obra";
import { cancelExecution, payInstallment, reschedulePayment, startExecution } from "@/lib/quote-execution";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schedule = z.discriminatedUnion("type", [
  z.object({ type: z.literal("single"), due_date: isoDate }),
  z.object({
    type: z.literal("recurring"),
    frequency: z.enum(["semanal", "quinzenal", "mensal"]),
    first_date: isoDate,
    count: z.number().int().min(1).max(60),
  }),
]);

const payment = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("total"), date: isoDate.optional() }),
  z.object({
    mode: z.literal("parcial"),
    paid_now: z.number().min(0).max(10_000_000),
    paid_date: isoDate.optional(),
    schedule,
  }),
]);

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    quote_id: z.string().uuid(),
    quantity: z.number().positive().max(1_000_000),
    payment,
  }),
  z.object({ action: z.literal("pay"), payment_id: z.string().uuid(), date: isoDate.optional() }),
  z.object({ action: z.literal("reschedule"), payment_id: z.string().uuid(), due_date: isoDate }),
  z.object({ action: z.literal("cancel"), quote_id: z.string().uuid() }),
  z.object({ action: z.literal("get"), quote_id: z.string().uuid() }),
]);

async function snapshot(db: ReturnType<typeof createSupabaseServer>, householdId: string, quoteId: string) {
  const [{ data: quote }, { data: payments }, { data: items }] = await Promise.all([
    db.from("price_quotes").select("*").eq("id", quoteId).eq("household_id", householdId).maybeSingle(),
    db.from("quote_payments").select("*").eq("quote_id", quoteId).order("due_date", { ascending: true }),
    db
      .from("obra_items")
      .select("id, name, quantity, unit, unit_price, actual_unit_price, status, bought_at")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false }),
  ]);
  return { quote, payments: payments ?? [], items: items ?? [] };
}

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const db = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) return NextResponse.json({ error: "no_module" }, { status: 400 });

  let quoteId: string;
  if (body.action === "start") {
    const base = { householdId: ctx.householdId, moduleId: mod.id, quoteId: body.quote_id, quantity: body.quantity };
    const r = await startExecution(db, { ...base, ...body.payment });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    quoteId = body.quote_id;
  } else if (body.action === "pay") {
    const r = await payInstallment(db, { householdId: ctx.householdId, moduleId: mod.id, paymentId: body.payment_id, date: body.date });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    quoteId = r.quoteId;
  } else if (body.action === "reschedule") {
    const r = await reschedulePayment(db, { householdId: ctx.householdId, paymentId: body.payment_id, dueDate: body.due_date });
    if (!r) return NextResponse.json({ error: "payment_not_found_or_paid" }, { status: 409 });
    quoteId = r.quote_id;
  } else if (body.action === "get") {
    quoteId = body.quote_id;
  } else {
    const r = await cancelExecution(db, { householdId: ctx.householdId, quoteId: body.quote_id });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    quoteId = body.quote_id;
  }

  return NextResponse.json({ ok: true, ...(await snapshot(db, ctx.householdId, quoteId)) });
}
