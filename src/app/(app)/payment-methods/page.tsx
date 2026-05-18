import { PaymentMethodManager } from "@/components/transactions/payment-method-manager";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("household_id", ctx.householdId)
    .is("archived_at", null)
    .order("name");

  // Compute current invoice for credit cards
  const cards = (data ?? []).filter((m) => m.kind === "credit_card");
  const invoices: Record<string, number> = {};
  for (const c of cards) {
    if (!c.closing_day) continue;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, c.closing_day);
    const end = new Date(today.getFullYear(), today.getMonth(), c.closing_day);
    const { data: tx } = await supabase
      .from("transactions")
      .select("amount")
      .eq("household_id", ctx.householdId)
      .eq("payment_method_id", c.id)
      .gte("occurred_at", start.toISOString().slice(0, 10))
      .lt("occurred_at", end.toISOString().slice(0, 10));
    invoices[c.id] = (tx ?? []).reduce((s, t) => s + Number(t.amount), 0);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Métodos de pagamento</h1>
        <p className="text-sm text-text-muted">Cartões, PIX, dinheiro, vouchers.</p>
      </header>
      <PaymentMethodManager
        initial={data ?? []}
        invoices={invoices}
        householdId={ctx.householdId}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
