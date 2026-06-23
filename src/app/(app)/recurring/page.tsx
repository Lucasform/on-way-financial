import { RecurringManager } from "@/components/common/recurring-manager";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const [{ data: rows }, { data: categories }, { data: methods }] = await Promise.all([
    supabase
      .from("recurring_transactions")
      .select("*")
      .eq("household_id", ctx.householdId)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, type")
      .eq("household_id", ctx.householdId)
      .order("name"),
    supabase
      .from("payment_methods")
      .select("id, name")
      .eq("household_id", ctx.householdId)
      .is("archived_at", null)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Recorrências</h1>
        <p className="text-sm text-text-muted">
          Cadastre lançamentos que se repetem (salário, aluguel, assinaturas). O sistema cria as transações
          automaticamente nas datas certas.
        </p>
      </header>
      <RecurringManager
        householdId={ctx.householdId}
        userId={ctx.userId}
        canWrite={ctx.role !== "viewer"}
        initial={rows ?? []}
        categories={categories ?? []}
        methods={methods ?? []}
      />
    </div>
  );
}
