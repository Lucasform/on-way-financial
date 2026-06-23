import { AccountsClient } from "@/components/accounts-client";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const [{ data: accs }, { data: txs }] = await Promise.all([
    supabase.from("accounts").select("*").eq("household_id", hid).eq("archived", false).order("created_at"),
    supabase.from("transactions").select("account_id, amount, type").eq("household_id", hid).not("account_id", "is", null),
  ]);

  const delta = new Map<string, number>();
  (txs ?? []).forEach((t) => {
    if (!t.account_id) return;
    const sign = t.type === "income" ? 1 : -1;
    delta.set(t.account_id, (delta.get(t.account_id) ?? 0) + sign * Number(t.amount));
  });

  const accounts = (accs ?? []).map((a) => ({
    ...a,
    balance: Number(a.opening_balance) + (delta.get(a.id) ?? 0),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
      <AccountsClient householdId={hid} accounts={accounts} />
    </div>
  );
}
