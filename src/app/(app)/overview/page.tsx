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

  const [{ data: items }, { data: suppliers }] = await Promise.all([
    supabase
      .from("obra_items")
      .select("quantity, unit_price, actual_unit_price")
      .eq("module_id", mod.id)
      .eq("status", "done"),
    supabase.from("suppliers").select("id, name").eq("household_id", ctx.householdId).order("name"),
  ]);

  const spentTotal = (items ?? []).reduce(
    (s, i) => s + Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0),
    0,
  );

  return (
    <ObraDashboard
      module={mod}
      spentTotal={spentTotal}
      canWrite={ctx.role !== "viewer"}
      suppliers={suppliers ?? []}
    />
  );
}
