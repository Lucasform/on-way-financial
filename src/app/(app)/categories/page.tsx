import { CategoryManager } from "@/components/transactions/category-manager";
import { Empty } from "@/components/ui/empty";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("categories")
    .select("id, name, type, color, icon, parent_id, position, is_system")
    .eq("household_id", ctx.householdId)
    .order("position");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Categorias</h1>
        <p className="text-sm text-text-muted">Organize seus gastos e receitas.</p>
      </header>
      {(!data || data.length === 0) ? (
        <Empty title="Nenhuma categoria" description="Crie a primeira para começar." />
      ) : (
        <CategoryManager initial={data} householdId={ctx.householdId} canWrite={ctx.role !== "viewer"} />
      )}
    </div>
  );
}
