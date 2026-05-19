import { ImportWizard } from "@/components/import/import-wizard";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const [{ data: categories }, { data: methods }] = await Promise.all([
    supabase.from("categories").select("id, name, type, color, icon").eq("household_id", ctx.householdId).order("name"),
    supabase
      .from("payment_methods")
      .select("id, name, kind")
      .eq("household_id", ctx.householdId)
      .is("archived_at", null)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Importar extrato</h1>
        <p className="text-sm text-text-muted">
          Suba um arquivo do banco (PDF, Excel, CSV) e a IA extrai, categoriza e detecta duplicatas.
        </p>
      </header>
      <ImportWizard
        canWrite={ctx.role !== "viewer"}
        categories={categories ?? []}
        methods={methods ?? []}
      />
    </div>
  );
}
