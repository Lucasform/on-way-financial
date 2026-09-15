import { ObraDashboard } from "@/components/modules/obra-dashboard";
import { ObraCreatePrompt } from "@/components/modules/obra-create-prompt";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();

  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("household_id", ctx.householdId)
    .eq("kind", "obra")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!mod) {
    return <ObraCreatePrompt householdId={ctx.householdId} canWrite={ctx.role !== "viewer"} />;
  }

  const [{ data: phases }, { data: workers }, { data: gallery }, { data: tx }, { data: items }, { data: diary }, { data: suppliers }, { data: quotes }] =
    await Promise.all([
      supabase.from("obra_phases").select("*").eq("module_id", mod.id).order("position"),
      supabase.from("obra_workers").select("*").eq("module_id", mod.id).order("name"),
      supabase.from("obra_gallery").select("*").eq("module_id", mod.id).order("taken_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("amount")
        .eq("household_id", ctx.householdId)
        .eq("module_id", mod.id)
        .eq("type", "expense"),
      supabase.from("obra_items").select("*").eq("module_id", mod.id).order("created_at", { ascending: false }),
      supabase.from("obra_diary").select("*").eq("module_id", mod.id).order("entry_date", { ascending: false }),
      supabase.from("suppliers").select("*").eq("household_id", ctx.householdId).order("name"),
      supabase.from("price_quotes").select("*").eq("household_id", ctx.householdId).order("quoted_at", { ascending: false }),
    ]);

  return (
    <ObraDashboard
      module={mod}
      phases={phases ?? []}
      workers={workers ?? []}
      gallery={gallery ?? []}
      transactions={tx ?? []}
      items={(items ?? []) as never}
      diary={(diary ?? []) as never}
      suppliers={suppliers ?? []}
      quotes={quotes ?? []}
      householdId={ctx.householdId}
      userId={ctx.userId}
      canWrite={ctx.role !== "viewer"}
    />
  );
}
