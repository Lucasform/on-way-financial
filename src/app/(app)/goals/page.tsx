import { GoalsClient } from "@/components/goals-client";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("household_id", hid)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
        <p className="text-sm text-fg-soft">Objetivos de economia e aportes.</p>
      </div>
      <GoalsClient householdId={hid} goals={goals ?? []} />
    </div>
  );
}
