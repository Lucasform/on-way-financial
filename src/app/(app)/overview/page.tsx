import { ObraDashboard } from "@/components/modules/obra-dashboard";
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

  const { data: tx } = await supabase
    .from("transactions")
    .select("amount")
    .eq("household_id", ctx.householdId)
    .eq("module_id", mod.id)
    .eq("type", "expense");

  return <ObraDashboard module={mod} transactions={tx ?? []} canWrite={ctx.role !== "viewer"} />;
}
