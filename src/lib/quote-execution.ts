import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { todayISO } from "@/lib/dates";
import { planRemainder, toCents, type RemainderSchedule } from "@/lib/installments";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

async function loadQuote(db: Db, householdId: string, quoteId: string) {
  const { data } = await db.from("price_quotes").select("*").eq("id", quoteId).eq("household_id", householdId).maybeSingle();
  return data;
}

async function createPaidItem(
  db: Db,
  args: { moduleId: string; quote: Database["public"]["Tables"]["price_quotes"]["Row"]; label: string; amount: number; date: string },
) {
  const { data: supplier } = await db.from("suppliers").select("name, category").eq("id", args.quote.supplier_id).maybeSingle();
  return db
    .from("obra_items")
    .insert({
      module_id: args.moduleId,
      category: supplier?.category ?? "material",
      name: `${args.quote.item_name} (${args.label})`,
      supplier: supplier?.name ?? null,
      supplier_id: args.quote.supplier_id,
      unit: "un",
      quantity: 1,
      unit_price: args.amount,
      actual_unit_price: args.amount,
      status: "done",
      bought_at: args.date,
      quote_id: args.quote.id,
    })
    .select("id")
    .single();
}

/** Recalcula: quitada vira aceita; deixou de estar quitada volta pra em execução. */
export async function settleQuote(db: Db, quoteId: string) {
  const { data: quote } = await db.from("price_quotes").select("id, total_amount, accepted_at, execution_started_at").eq("id", quoteId).maybeSingle();
  if (!quote?.execution_started_at || quote.total_amount == null) return;
  const { data: payments } = await db.from("quote_payments").select("amount, paid_at").eq("quote_id", quoteId);
  const paid = (payments ?? []).filter((p) => p.paid_at).reduce((s, p) => s + toCents(Number(p.amount)), 0);
  const settled = paid >= toCents(Number(quote.total_amount));
  if (settled && !quote.accepted_at) {
    await db.from("price_quotes").update({ accepted_at: new Date().toISOString() }).eq("id", quoteId);
  } else if (!settled && quote.accepted_at) {
    await db.from("price_quotes").update({ accepted_at: null }).eq("id", quoteId);
  }
}

export type StartExecutionInput = {
  householdId: string;
  moduleId: string;
  quoteId: string;
  quantity: number;
} & (
  | { mode: "total"; date?: string | null }
  | { mode: "parcial"; paid_now: number; paid_date?: string | null; schedule: RemainderSchedule }
);

export async function startExecution(db: Db, input: StartExecutionInput): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const quote = await loadQuote(db, input.householdId, input.quoteId);
  if (!quote) return { ok: false, error: "quote_not_found", status: 404 };
  const totalCents = toCents(Number(quote.unit_price) * input.quantity);
  if (totalCents <= 0) return { ok: false, error: "invalid_total", status: 400 };
  const now = new Date().toISOString();

  if (input.mode === "parcial") {
    const paidCents = toCents(input.paid_now);
    if (paidCents < 0 || paidCents >= totalCents) return { ok: false, error: "paid_now_out_of_range", status: 400 };
  }

  // Reivindica a cotação só se ainda estiver em aberto (evita clique duplo / duas abas).
  const { data: claimed, error: claimErr } = await db
    .from("price_quotes")
    .update({
      execution_started_at: now,
      total_amount: totalCents / 100,
      accepted_at: input.mode === "total" ? now : null,
    })
    .eq("id", quote.id)
    .is("execution_started_at", null)
    .is("accepted_at", null)
    .select("id")
    .maybeSingle();
  if (claimErr) return { ok: false, error: claimErr.message, status: 500 };
  if (!claimed) return { ok: false, error: "already_started", status: 409 };

  const rollback = async () => {
    await db.from("quote_payments").delete().eq("quote_id", quote.id);
    await db.from("obra_items").delete().eq("quote_id", quote.id);
    await db.from("price_quotes").update({ execution_started_at: null, total_amount: null, accepted_at: null }).eq("id", quote.id);
  };

  if (input.mode === "total") {
    const { data: supplier } = await db.from("suppliers").select("name, category").eq("id", quote.supplier_id).maybeSingle();
    const { error } = await db.from("obra_items").insert({
      module_id: input.moduleId,
      category: supplier?.category ?? "material",
      name: quote.item_name,
      supplier: supplier?.name ?? null,
      supplier_id: quote.supplier_id,
      material_type_id: quote.material_type_id,
      unit: quote.unit,
      quantity: input.quantity,
      unit_price: quote.unit_price,
      actual_unit_price: quote.unit_price,
      status: "done",
      bought_at: input.date || todayISO(),
      quote_id: quote.id,
    });
    if (error) {
      await rollback();
      return { ok: false, error: error.message, status: 500 };
    }
    return { ok: true };
  }

  const remaining = (totalCents - toCents(input.paid_now)) / 100;
  const planned = planRemainder(remaining, input.schedule);

  if (input.paid_now > 0) {
    const paidDate = input.paid_date || todayISO();
    const { data: item, error: itemErr } = await createPaidItem(db, {
      moduleId: input.moduleId,
      quote,
      label: "entrada",
      amount: input.paid_now,
      date: paidDate,
    });
    if (itemErr || !item) {
      await rollback();
      return { ok: false, error: itemErr?.message ?? "item_failed", status: 500 };
    }
    const { error: payErr } = await db.from("quote_payments").insert({
      household_id: input.householdId,
      quote_id: quote.id,
      label: "entrada",
      amount: input.paid_now,
      due_date: paidDate,
      paid_at: paidDate,
      item_id: item.id,
    });
    if (payErr) {
      await rollback();
      return { ok: false, error: payErr.message, status: 500 };
    }
  }

  const { error: schedErr } = await db.from("quote_payments").insert(
    planned.map((p) => ({ household_id: input.householdId, quote_id: quote.id, label: p.label, amount: p.amount, due_date: p.due_date })),
  );
  if (schedErr) {
    await rollback();
    return { ok: false, error: schedErr.message, status: 500 };
  }
  return { ok: true };
}

export async function payInstallment(
  db: Db,
  args: { householdId: string; moduleId: string; paymentId: string; date?: string | null },
): Promise<{ ok: true; quoteId: string } | { ok: false; error: string; status: number }> {
  const date = args.date || todayISO();
  const { data: payment } = await db
    .from("quote_payments")
    .update({ paid_at: date })
    .eq("id", args.paymentId)
    .eq("household_id", args.householdId)
    .is("paid_at", null)
    .select("*")
    .maybeSingle();
  if (!payment) return { ok: false, error: "payment_not_found_or_paid", status: 409 };

  const quote = await loadQuote(db, args.householdId, payment.quote_id);
  if (!quote) return { ok: false, error: "quote_not_found", status: 404 };

  const { data: item, error } = await createPaidItem(db, {
    moduleId: args.moduleId,
    quote,
    label: payment.label,
    amount: Number(payment.amount),
    date,
  });
  if (error || !item) {
    await db.from("quote_payments").update({ paid_at: null }).eq("id", payment.id);
    return { ok: false, error: error?.message ?? "item_failed", status: 500 };
  }
  await db.from("quote_payments").update({ item_id: item.id }).eq("id", payment.id);
  await settleQuote(db, quote.id);
  return { ok: true, quoteId: quote.id };
}

export async function reschedulePayment(db: Db, args: { householdId: string; paymentId: string; dueDate: string }) {
  const { data } = await db
    .from("quote_payments")
    .update({ due_date: args.dueDate })
    .eq("id", args.paymentId)
    .eq("household_id", args.householdId)
    .is("paid_at", null)
    .select("quote_id")
    .maybeSingle();
  return data;
}

/** Volta a cotação pra em aberto. Só se nenhum pagamento foi feito ainda. */
export async function cancelExecution(db: Db, args: { householdId: string; quoteId: string }): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const quote = await loadQuote(db, args.householdId, args.quoteId);
  if (!quote) return { ok: false, error: "quote_not_found", status: 404 };
  const { data: payments } = await db.from("quote_payments").select("id, paid_at").eq("quote_id", quote.id);
  if ((payments ?? []).some((p) => p.paid_at)) return { ok: false, error: "has_paid_payments", status: 409 };
  await db.from("quote_payments").delete().eq("quote_id", quote.id);
  await db.from("price_quotes").update({ execution_started_at: null, total_amount: null, accepted_at: null }).eq("id", quote.id);
  return { ok: true };
}

/**
 * Chamado antes de apagar um custo. Se o custo era um pagamento de cotação, esse pagamento volta a
 * ficar agendado (o total da cotação continua o mesmo). Retorna o quote_id afetado.
 */
export async function revertPaymentForItem(db: Db, itemId: string): Promise<string | null> {
  const { data: payment } = await db
    .from("quote_payments")
    .update({ paid_at: null, item_id: null })
    .eq("item_id", itemId)
    .select("quote_id")
    .maybeSingle();
  return payment?.quote_id ?? null;
}
