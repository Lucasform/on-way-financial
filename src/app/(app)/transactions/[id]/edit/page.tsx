import { notFound } from "next/navigation";

import { EditTransactionForm, type EditTx } from "@/components/transactions/edit-transaction-form";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({ params }: { params: { id: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();

  const [{ data: tx }, { data: categories }, { data: methods }, { data: modules }] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, amount, description, occurred_at, category_id, payment_method_id, module_id, notes, installment_number, installments_total, receipt_url",
      )
      .eq("id", params.id)
      .eq("household_id", ctx.householdId)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, type, color")
      .eq("household_id", ctx.householdId)
      .order("position"),
    supabase
      .from("payment_methods")
      .select("id, name, kind, is_default")
      .eq("household_id", ctx.householdId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("modules")
      .select("id, kind, name")
      .eq("household_id", ctx.householdId)
      .in("status", ["planning", "active"])
      .order("created_at", { ascending: false }),
  ]);

  if (!tx) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Editar transação</h1>
        <p className="text-sm text-text-muted">Ajuste os campos e salve. O recibo e parcelas relacionadas ficam intactos.</p>
      </header>
      <EditTransactionForm
        tx={tx as unknown as EditTx}
        categories={categories ?? []}
        methods={methods ?? []}
        modules={modules ?? []}
      />
    </div>
  );
}
