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

  const [{ data: items }, { data: tx }, { data: days }, { data: activities }, { data: checklist }, { data: gallery }] =
    await Promise.all([
      supabase.from("travel_items").select("*").eq("module_id", params.id).order("start_date"),
      supabase
        .from("transactions")
        .select("id, amount, description, occurred_at")
        .eq("module_id", params.id)
        .order("occurred_at", { ascending: false }),
      supabase.from("travel_days").select("*").eq("module_id", params.id).order("day_number"),
      supabase.from("travel_activities").select("*").eq("module_id", params.id).order("position"),
      supabase.from("travel_checklist").select("*").eq("module_id", params.id).order("position"),
      supabase.from("travel_gallery").select("*").eq("module_id", params.id).order("taken_at", { ascending: false }),
    ]);

  return (
    <TravelDashboard
      module={mod}
      items={items ?? []}
      transactions={tx ?? []}
      days={(days ?? []) as never}
      activities={(activities ?? []) as never}
      checklist={(checklist ?? []) as never}
      gallery={(gallery ?? []) as never}
      householdId={ctx.householdId}
      canWrite={ctx.role !== "viewer"}
    />
  );
}
