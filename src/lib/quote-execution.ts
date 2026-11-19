import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { todayISO } from "@/lib/dates";
import { type PlannedPayment, toCents } from "@/lib/installments";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

async function loadQuote(db: Db, householdId: string, quoteId: string) {
  const { data } = await db
    .from("price_quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("household_id", householdId)
    .maybeSingle();
  return data;
}

async function createPaidItem(
  db: Db,
  args: {
    moduleId: string;
    quote: Database["public"]["Tables"]["price_quotes"]["Row"];
    label: string;
    amount: number;
    date: string;
  },
) {
  const { data: supplier } = await db
    .from("suppliers")
    .select("name, category")
    .eq("id", args.quote.supplier_id)
    .maybeSingle();
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
  const { data: quote } = await db
    .from("price_quotes")
    .select("id, total_amount, accepted_at, execution_started_at, cancelled_at")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote?.execution_started_at || quote.total_amount == null || quote.cancelled_at) return;
  const { data: payments } = await db
    .from("quote_payments")
    .select("amount, paid_at")
    .eq("quote_id", quoteId);
  const paid = (payments ?? [])
    .filter((p) => p.paid_at)
    .reduce((s, p) => s + toCents(Number(p.amount)), 0);
  const settled = paid >= toCents(Number(quote.total_amount));
  if (settled && !quote.accepted_at) {
    await db
      .from("price_quotes")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", quoteId);
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
  | { mode: "parcial"; paid_now: number; paid_date?: string | null; installments: PlannedPayment[] }
);

export async function startExecution(
  db: Db,
  input: StartExecutionInput,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const quote = await loadQuote(db, input.householdId, input.quoteId);
  if (!quote) return { ok: false, error: "quote_not_found", status: 404 };
  if (quote.rejected_at) return { ok: false, error: "quote_rejected", status: 409 };
  const totalCents = toCents(Number(quote.unit_price) * input.quantity);
  if (totalCents <= 0) return { ok: false, error: "invalid_total", status: 400 };
  const now = new Date().toISOString();

  if (input.mode === "parcial") {
    const paidCents = toCents(input.paid_now);
    if (paidCents < 0 || paidCents >= totalCents)
      return { ok: false, error: "paid_now_out_of_range", status: 400 };
    const plannedCents = input.installments.reduce((s, p) => s + toCents(p.amount), 0);
    if (
      plannedCents !== totalCents - paidCents ||
      input.installments.some((p) => toCents(p.amount) <= 0)
    ) {
      return { ok: false, error: "plan_sum_mismatch", status: 400 };
    }
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
    .is("rejected_at", null)
    .select("id")
    .maybeSingle();
  if (claimErr) return { ok: false, error: claimErr.message, status: 500 };
  if (!claimed) return { ok: false, error: "already_started", status: 409 };

  const rollback = async () => {
    await db.from("quote_payments").delete().eq("quote_id", quote.id);
    await db.from("obra_items").delete().eq("quote_id", quote.id);
    await db
      .from("price_quotes")
      .update({ execution_started_at: null, total_amount: null, accepted_at: null })
      .eq("id", quote.id);
  };

  if (input.mode === "total") {
    const { data: supplier } = await db
      .from("suppliers")
      .select("name, category")
      .eq("id", quote.supplier_id)
      .maybeSingle();
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

  const planned = input.installments;

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
    planned.map((p) => ({
      household_id: input.householdId,
      quote_id: quote.id,
      label: p.label,
      amount: toCents(p.amount) / 100,
      due_date: p.due_date,
    })),
  );
  if (schedErr) {
    await rollback();
    return { ok: false, error: schedErr.message, status: 500 };
  }
  return { ok: true };
}

/** O que fazer com a diferença quando se paga (ou corrige para) menos que o valor da parcela. */
export type Remainder = { mode: "reschedule"; dueDate: string } | { mode: "cancel" };

/** O total da cotação passa a ser a soma das parcelas (pagas e a pagar) e o status é recalculado. */
async function recomputeQuoteTotal(db: Db, householdId: string, quoteId: string) {
  const { data: all } = await db.from("quote_payments").select("amount").eq("quote_id", quoteId);
  const totalCents = (all ?? []).reduce((s, p) => s + toCents(Number(p.amount)), 0);
  await db
    .from("price_quotes")
    .update({ total_amount: totalCents / 100 })
    .eq("id", quoteId)
    .eq("household_id", householdId);
  await settleQuote(db, quoteId);
}

/**
 * Paga uma parcela agendada. Com `amount` menor que a parcela, paga só uma parte: a diferença vira
 * uma parcela nova "(restante)" na data escolhida, ou é cancelada (o total da cotação diminui).
 */
export async function payInstallment(
  db: Db,
  args: {
    householdId: string;
    moduleId: string;
    paymentId: string;
    date?: string | null;
    amount?: number | null;
    remainder?: Remainder | null;
  },
): Promise<{ ok: true; quoteId: string } | { ok: false; error: string; status: number }> {
  const date = args.date || todayISO();
  const { data: current } = await db
    .from("quote_payments")
    .select("*")
    .eq("id", args.paymentId)
    .eq("household_id", args.householdId)
    .is("paid_at", null)
    .maybeSingle();
  if (!current) return { ok: false, error: "payment_not_found_or_paid", status: 409 };
  const fullCents = toCents(Number(current.amount));
  const paidCents = args.amount == null ? fullCents : toCents(args.amount);
  if (paidCents <= 0 || paidCents > fullCents) return { ok: false, error: "pay_amount_out_of_range", status: 400 };

  const { data: payment } = await db
    .from("quote_payments")
    .update({ paid_at: date, amount: paidCents / 100 })
    .eq("id", current.id)
    .is("paid_at", null)
    .select("*")
    .maybeSingle();
  if (!payment) return { ok: false, error: "payment_not_found_or_paid", status: 409 };
  const undo = () => db.from("quote_payments").update({ paid_at: null, amount: fullCents / 100 }).eq("id", current.id);

  const quote = await loadQuote(db, args.householdId, payment.quote_id);
  if (!quote) {
    await undo();
    return { ok: false, error: "quote_not_found", status: 404 };
  }

  let restId: string | null = null;
  const restCents = fullCents - paidCents;
  if (restCents > 0 && (args.remainder?.mode ?? "reschedule") === "reschedule") {
    const due = args.remainder?.mode === "reschedule" ? args.remainder.dueDate : current.due_date;
    const { data: rest, error: restErr } = await db
      .from("quote_payments")
      .insert({
        household_id: args.householdId,
        quote_id: quote.id,
        label: `${current.label} (restante)`,
        amount: restCents / 100,
        due_date: due,
      })
      .select("id")
      .single();
    if (restErr || !rest) {
      await undo();
      return { ok: false, error: restErr?.message ?? "remainder_failed", status: 500 };
    }
    restId = rest.id;
  }

  const { data: item, error } = await createPaidItem(db, {
    moduleId: args.moduleId,
    quote,
    label: payment.label,
    amount: paidCents / 100,
    date,
  });
  if (error || !item) {
    if (restId) await db.from("quote_payments").delete().eq("id", restId);
    await undo();
    return { ok: false, error: error?.message ?? "item_failed", status: 500 };
  }
  await db.from("quote_payments").update({ item_id: item.id }).eq("id", payment.id);
  await recomputeQuoteTotal(db, args.householdId, quote.id);
  return { ok: true, quoteId: quote.id };
}

type ItemRow = Pick<
  Database["public"]["Tables"]["obra_items"]["Row"],
  "id" | "name" | "quantity" | "unit_price" | "actual_unit_price" | "bought_at" | "quote_id" | "status"
>;

async function loadDoneItem(db: Db, moduleId: string, itemId: string): Promise<ItemRow | null> {
  const { data } = await db
    .from("obra_items")
    .select("id, name, quantity, unit_price, actual_unit_price, bought_at, quote_id, status")
    .eq("id", itemId)
    .eq("module_id", moduleId)
    .eq("status", "done")
    .maybeSingle();
  return data;
}

const itemCents = (i: ItemRow) => toCents(Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0));

/**
 * Pagamento de cotação que ainda não tem linha em quote_payments (cotação executada de uma vez):
 * cria a linha paga pra que correção e desfazer funcionem igual às parcelas.
 */
async function ensurePaymentForItem(db: Db, householdId: string, item: ItemRow) {
  const { data: existing } = await db
    .from("quote_payments")
    .select("*")
    .eq("item_id", item.id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (existing || !item.quote_id) return existing;
  const paidAt = item.bought_at ?? todayISO();
  const { data } = await db
    .from("quote_payments")
    .insert({
      household_id: householdId,
      quote_id: item.quote_id,
      label: "pagamento",
      amount: itemCents(item) / 100,
      due_date: paidAt,
      paid_at: paidAt,
      item_id: item.id,
    })
    .select("*")
    .single();
  return data;
}

/**
 * Corrige um pagamento já lançado (valor e data) sem apagar. Se o valor certo for menor, a diferença
 * vira parcela reagendada ou é cancelada (o total da cotação diminui). Custo avulso só muda o valor.
 */
export async function correctPaidItem(
  db: Db,
  args: { householdId: string; moduleId: string; itemId: string; amount: number; date: string; remainder?: Remainder | null },
): Promise<{ ok: true; quoteId: string | null } | { ok: false; error: string; status: number }> {
  const item = await loadDoneItem(db, args.moduleId, args.itemId);
  if (!item) return { ok: false, error: "item_not_found", status: 404 };
  const newCents = toCents(args.amount);
  if (newCents <= 0) return { ok: false, error: "invalid_amount", status: 400 };
  const oldCents = itemCents(item);

  // Cotação sem parcelas (executada de uma vez): a linha de pagamento nasce com o valor antigo.
  const payment = item.quote_id ? await ensurePaymentForItem(db, args.householdId, item) : null;
  if (item.quote_id && !payment) return { ok: false, error: "payment_failed", status: 500 };

  const qty = Number(item.quantity) || 1;
  const perUnit = Math.round(newCents / qty) / 100;
  const keepsQty = toCents(perUnit * qty) === newCents;
  const { error: itemErr } = await db
    .from("obra_items")
    .update(
      keepsQty
        ? { actual_unit_price: perUnit, bought_at: args.date }
        : { quantity: 1, unit_price: newCents / 100, actual_unit_price: newCents / 100, bought_at: args.date },
    )
    .eq("id", item.id);
  if (itemErr) return { ok: false, error: itemErr.message, status: 500 };
  if (!item.quote_id || !payment) return { ok: true, quoteId: null };

  await db.from("quote_payments").update({ amount: newCents / 100, paid_at: args.date }).eq("id", payment.id);
  const restCents = oldCents - newCents;
  if (restCents > 0 && args.remainder?.mode === "reschedule") {
    await db.from("quote_payments").insert({
      household_id: args.householdId,
      quote_id: item.quote_id,
      label: `${payment.label} (restante)`,
      amount: restCents / 100,
      due_date: args.remainder.dueDate,
    });
  }
  await recomputeQuoteTotal(db, args.householdId, item.quote_id);
  return { ok: true, quoteId: item.quote_id };
}

/** Desfaz um pagamento de cotação: o custo sai do gasto e o valor volta a ficar agendado. */
export async function unpayItem(
  db: Db,
  args: { householdId: string; moduleId: string; itemId: string },
): Promise<{ ok: true; quoteId: string } | { ok: false; error: string; status: number }> {
  const item = await loadDoneItem(db, args.moduleId, args.itemId);
  if (!item) return { ok: false, error: "item_not_found", status: 404 };
  if (!item.quote_id) return { ok: false, error: "not_from_quote", status: 400 };
  const payment = await ensurePaymentForItem(db, args.householdId, item);
  if (!payment) return { ok: false, error: "payment_failed", status: 500 };
  const { error } = await db.from("quote_payments").update({ paid_at: null, item_id: null }).eq("id", payment.id);
  if (error) return { ok: false, error: error.message, status: 500 };
  const { error: delErr } = await db.from("obra_items").delete().eq("id", item.id).eq("module_id", args.moduleId);
  if (delErr) {
    await db.from("quote_payments").update({ paid_at: payment.paid_at, item_id: item.id }).eq("id", payment.id);
    return { ok: false, error: delErr.message, status: 500 };
  }
  await recomputeQuoteTotal(db, args.householdId, item.quote_id);
  return { ok: true, quoteId: item.quote_id };
}

export async function reschedulePayment(
  db: Db,
  args: { householdId: string; paymentId: string; dueDate: string },
) {
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

/**
 * Muda o valor de uma parcela ainda não paga. O total da cotação passa a ser a soma das parcelas,
 * então a cotação continua fechando certinho (e vira Aceita se já estiver tudo pago).
 */
export async function updatePaymentAmount(
  db: Db,
  args: { householdId: string; paymentId: string; amount: number },
) {
  const { data } = await db
    .from("quote_payments")
    .update({ amount: toCents(args.amount) / 100 })
    .eq("id", args.paymentId)
    .eq("household_id", args.householdId)
    .is("paid_at", null)
    .select("quote_id")
    .maybeSingle();
  if (!data) return null;
  const { data: all } = await db
    .from("quote_payments")
    .select("amount")
    .eq("quote_id", data.quote_id);
  const totalCents = (all ?? []).reduce((s, p) => s + toCents(Number(p.amount)), 0);
  await db
    .from("price_quotes")
    .update({ total_amount: totalCents / 100 })
    .eq("id", data.quote_id)
    .eq("household_id", args.householdId);
  await settleQuote(db, data.quote_id);
  return data;
}

/** Volta a cotação pra em aberto. Só se nenhum pagamento foi feito ainda. */
export async function cancelExecution(
  db: Db,
  args: { householdId: string; quoteId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const quote = await loadQuote(db, args.householdId, args.quoteId);
  if (!quote) return { ok: false, error: "quote_not_found", status: 404 };
  const { data: payments } = await db
    .from("quote_payments")
    .select("id, paid_at")
    .eq("quote_id", quote.id);
  if ((payments ?? []).some((p) => p.paid_at))
    return { ok: false, error: "has_paid_payments", status: 409 };
  await db.from("quote_payments").delete().eq("quote_id", quote.id);
  await db
    .from("price_quotes")
    .update({ execution_started_at: null, total_amount: null, accepted_at: null })
    .eq("id", quote.id);
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

/**
 * Cancela uma compra já executada (devolução/reembolso) sem apagar o histórico: os custos viram
 * 'cancelled' e saem do gasto, as parcelas ainda não pagas somem e a cotação fica Cancelada.
 * Custo avulso (sem cotação) é cancelado sozinho.
 */
export async function cancelPurchase(
  db: Db,
  args: {
    householdId: string;
    moduleId: string;
    quoteId?: string;
    itemId?: string;
    date: string;
    reason: string | null;
  },
): Promise<{ ok: true; quoteId: string | null } | { ok: false; error: string; status: number }> {
  let quoteId = args.quoteId ?? null;
  if (!quoteId && args.itemId) {
    const { data: item } = await db
      .from("obra_items")
      .select("id, quote_id, status")
      .eq("id", args.itemId)
      .eq("module_id", args.moduleId)
      .maybeSingle();
    if (!item) return { ok: false, error: "item_not_found", status: 404 };
    if (!item.quote_id) {
      if (item.status !== "done") return { ok: false, error: "not_executed", status: 409 };
      const { error } = await db
        .from("obra_items")
        .update({ status: "cancelled", cancelled_at: args.date, cancel_reason: args.reason })
        .eq("id", item.id);
      if (error) return { ok: false, error: error.message, status: 500 };
      return { ok: true, quoteId: null };
    }
    quoteId = item.quote_id;
  }
  if (!quoteId) return { ok: false, error: "invalid", status: 400 };

  const quote = await loadQuote(db, args.householdId, quoteId);
  if (!quote) return { ok: false, error: "quote_not_found", status: 404 };
  if (quote.cancelled_at) return { ok: false, error: "already_cancelled", status: 409 };
  if (!quote.accepted_at && !quote.execution_started_at)
    return { ok: false, error: "not_executed", status: 409 };

  const { error: itemsErr } = await db
    .from("obra_items")
    .update({ status: "cancelled", cancelled_at: args.date, cancel_reason: args.reason })
    .eq("quote_id", quote.id)
    .eq("module_id", args.moduleId)
    .eq("status", "done");
  if (itemsErr) return { ok: false, error: itemsErr.message, status: 500 };
  await db.from("quote_payments").delete().eq("quote_id", quote.id).is("paid_at", null);
  const { error } = await db
    .from("price_quotes")
    .update({ cancelled_at: args.date, cancel_reason: args.reason })
    .eq("id", quote.id)
    .eq("household_id", args.householdId);
  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true, quoteId: quote.id };
}
