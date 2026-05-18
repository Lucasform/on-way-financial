import { NewTransactionForm } from "@/components/transactions/new-transaction-form";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const [{ data: categories }, { data: methods }, { data: modules }] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Nova transação</h1>
        <p className="text-sm text-text-muted">Preencha os dados. Você pode anexar comprovante e vincular a um módulo.</p>
      </header>
      <NewTransactionForm
        userId={ctx.userId}
        householdId={ctx.householdId}
        categories={categories ?? []}
        methods={methods ?? []}
        modules={modules ?? []}
      />
    </div>
  );
}
