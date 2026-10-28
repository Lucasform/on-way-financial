import { ObraDashboard, type UpcomingPayment } from "@/components/modules/obra-dashboard";
import type { UpcomingActivity } from "@/components/modules/daily-briefing";
import { todayISO } from "@/lib/dates";
import { addDaysISO } from "@/lib/installments";
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

  const today = todayISO();
  const [{ data: items }, { data: suppliers }, { data: scheduled }, { data: acts }] = await Promise.all([
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
      .limit(50),
    supabase
      .from("obra_activities")
      .select("id, title, due_date, assignee")
      .eq("module_id", mod.id)
      .neq("status", "feito")
      .not("due_date", "is", null)
      .lte("due_date", addDaysISO(today, 7))
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
  const allScheduled: UpcomingPayment[] = ((scheduled ?? []) as unknown as ScheduledRow[]).map((p) => ({
    id: p.id,
    label: p.label,
    amount: Number(p.amount),
    due_date: p.due_date,
    item_name: p.price_quotes?.item_name ?? "Pagamento",
    supplier_name: p.price_quotes?.suppliers?.name ?? null,
  }));
  const weekEnd = addDaysISO(today, 7);
  const upcomingPayments = allScheduled.filter((p) => p.due_date <= weekEnd);
  const nextPayment = allScheduled.find((p) => p.due_date > weekEnd) ?? null;

  const upcomingActivities: UpcomingActivity[] = (acts ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    due_date: a.due_date!,
    assignee: a.assignee,
  }));

  return (
    <ObraDashboard
      module={mod}
      spentTotal={spentTotal}
      canWrite={ctx.role !== "viewer"}
      suppliers={suppliers ?? []}
      upcomingPayments={upcomingPayments}
      nextPayment={nextPayment}
      upcomingActivities={upcomingActivities}
      today={today}
    />
  );
}
