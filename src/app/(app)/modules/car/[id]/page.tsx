import { notFound } from "next/navigation";

import { CarDashboard } from "@/components/modules/car-dashboard";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CarPage({ params }: { params: { id: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", params.id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (!mod) notFound();
  const [{ data: options }, { data: incomes }] = await Promise.all([
    supabase.from("car_options").select("*").eq("module_id", params.id).order("created_at"),
    supabase
      .from("transactions")
      .select("amount")
      .eq("module_id", params.id)
      .eq("type", "income"),
  ]);
  const savings = (incomes ?? []).reduce((s, t) => s + Number(t.amount), 0);
  return <CarDashboard module={mod} options={options ?? []} savings={savings} canWrite={ctx.role !== "viewer"} />;
}
