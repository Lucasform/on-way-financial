import { redirect } from "next/navigation";

import { type ExecutedRow, ObraPaymentsTab, type ScheduledRow } from "@/components/modules/obra-payments-tab";
import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { todayISO } from "@/lib/dates";
import { loadActiveContext } from "@/lib/household";
import { getObraModule } from "@/lib/obra";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PaymentJoin = {
  id: string;
  quote_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  price_quotes: { item_name: string; supplier_id: string; suppliers: { name: string } | null } | null;
};

export default async function PagamentosPage({ searchParams }: { searchParams: { tab?: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: pending }, { data: items }, { data: suppliers }, { data: paidPayments }] = await Promise.all([
    supabase
      .from("quote_payments")
      .select("id, quote_id, label, amount, due_date, price_quotes(item_name, supplier_id, suppliers(name))")
      .eq("household_id", ctx.householdId)
      .is("paid_at", null),
    supabase
      .from("obra_items")
      .select("id, name, supplier_id, supplier, quantity, unit_price, actual_unit_price, bought_at, created_at")
      .eq("module_id", mod.id)
      .eq("status", "done"),
    supabase.from("suppliers").select("id, name").eq("household_id", ctx.householdId),
    supabase.from("quote_payments").select("item_id, label").eq("household_id", ctx.householdId).not("item_id", "is", null),
  ]);

  const scheduled: ScheduledRow[] = ((pending ?? []) as unknown as PaymentJoin[]).map((p) => ({
    id: p.id,
    quote_id: p.quote_id,
    label: p.label,
    amount: Number(p.amount),
    due_date: p.due_date,
    item_name: p.price_quotes?.item_name ?? "Pagamento",
    supplier_id: p.price_quotes?.supplier_id ?? null,
    supplier_name: p.price_quotes?.suppliers?.name ?? null,
  }));

  const nameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const labelByItem = new Map((paidPayments ?? []).map((p) => [p.item_id, p.label]));
  const executed: ExecutedRow[] = (items ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    supplier_id: i.supplier_id && nameById.has(i.supplier_id) ? i.supplier_id : null,
    supplier_name: (i.supplier_id && nameById.get(i.supplier_id)) || i.supplier || null,
    amount: Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0),
    date: i.bought_at ?? i.created_at.slice(0, 10),
    payment_label: labelByItem.get(i.id) ?? null,
  }));

  return (
    <div>
      <ObraSectionHeader title="Pagamentos" subtitle="O que está agendado e o que já foi pago" />
      <ObraPaymentsTab
        scheduled={scheduled}
        executed={executed}
        today={todayISO()}
        initialTab={searchParams.tab === "executados" ? "executados" : "agendados"}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
