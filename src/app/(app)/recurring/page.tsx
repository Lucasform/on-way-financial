import { RecurringClient } from "@/components/recurring-client";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const [{ data: rules }, { data: cats }] = await Promise.all([
    supabase.from("recurring_rules").select("*").eq("household_id", hid).order("next_run"),
    supabase.from("categories").select("id, name, kind").eq("household_id", hid).eq("archived", false).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recorrências</h1>
        <p className="text-sm text-fg-soft">Contas fixas e receitas recorrentes.</p>
      </div>
      <RecurringClient householdId={hid} rules={rules ?? []} categories={cats ?? []} />
    </div>
  );
}
