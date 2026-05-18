import { notFound } from "next/navigation";

import { TravelDashboard } from "@/components/modules/travel-dashboard";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TravelPage({ params }: { params: { id: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", params.id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (!mod) notFound();
  const [{ data: items }, { data: tx }] = await Promise.all([
    supabase.from("travel_items").select("*").eq("module_id", params.id).order("start_date"),
    supabase
      .from("transactions")
      .select("id, amount, description, occurred_at")
      .eq("module_id", params.id)
      .order("occurred_at", { ascending: false }),
  ]);
  return (
    <TravelDashboard module={mod} items={items ?? []} transactions={tx ?? []} canWrite={ctx.role !== "viewer"} />
  );
}
