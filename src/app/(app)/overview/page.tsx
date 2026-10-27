import { ObraDashboard, type UpcomingPayment } from "@/components/modules/obra-dashboard";
import { todayISO } from "@/lib/dates";
import { ObraCreatePrompt } from "@/components/modules/obra-create-prompt";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);

  if (!mod) {
    return <ObraCreatePrompt householdId={ctx.householdId} canWrite={ctx.role !== "viewer"} />;
  }

  const [{ data: items }, { data: suppliers }, { data: scheduled }] = await Promise.all([
    supabase
      .from("obra_items")
      .select("quantity, unit_price, actual_unit_price")
      .eq("module_id", mod.id)
      .eq("status", "done"),
    supabase.from("suppliers").select("id, name").eq("household_id", ctx.householdId).order("name"),
    supabase
      .from("quote_payments")
      .select("id, label, amount, due_date, price_quotes(item_name, suppliers(name))")
      .eq("household_id", ctx.householdId)
      .is("paid_at", null)
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(20),
  ]);

  const spentTotal = (items ?? []).reduce(
    (s, i) => s + Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0),
    0,
  );

  type ScheduledRow = {
    id: string;
    label: string;
    amount: number;
    due_date: string;
    price_quotes: { item_name: string; suppliers: { name: string } | null } | null;
  };
  const upcomingPayments: UpcomingPayment[] = ((scheduled ?? []) as unknown as ScheduledRow[]).map((p) => ({
    id: p.id,
    label: p.label,
    amount: Number(p.amount),
    due_date: p.due_date,
    item_name: p.price_quotes?.item_name ?? "Pagamento",
    supplier_name: p.price_quotes?.suppliers?.name ?? null,
  }));

  return (
    <ObraDashboard
      module={mod}
      spentTotal={spentTotal}
      canWrite={ctx.role !== "viewer"}
      suppliers={suppliers ?? []}
      upcomingPayments={upcomingPayments}
      today={todayISO()}
    />
  );
}
