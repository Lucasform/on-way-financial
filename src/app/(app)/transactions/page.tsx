import { AILauncher } from "@/components/ai-launcher";
import { TransactionsClient, type TxRow } from "@/components/transactions-client";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const [{ data: txs }, { data: cats }, { data: accs }, { data: mods }, { data: customFields }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount, description, occurred_on, source, category_id, account_id, module_id, custom")
      .eq("household_id", hid)
      .order("occurred_on", { ascending: false })
      .limit(300),
    supabase
      .from("categories")
      .select("id, name, kind, color")
      .eq("household_id", hid)
      .eq("archived", false)
      .order("name"),
    supabase.from("accounts").select("id, name").eq("household_id", hid).eq("archived", false),
    supabase.from("modules").select("id, name").eq("household_id", hid).neq("status", "archived").order("created_at", { ascending: false }),
    supabase
      .from("custom_fields")
      .select("*")
      .eq("household_id", hid)
      .eq("object_key", "transactions")
      .eq("active", true)
      .order("position"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Lançamentos</h1>
      <AILauncher householdId={hid} modules={mods ?? []} />
      <TransactionsClient
        householdId={hid}
        rows={(txs ?? []) as TxRow[]}
        categories={cats ?? []}
        accounts={accs ?? []}
        modules={mods ?? []}
        customFields={(customFields ?? []) as any}
      />
    </div>
  );
}
