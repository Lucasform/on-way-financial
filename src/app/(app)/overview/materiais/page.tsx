import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraItemsTab } from "@/components/modules/obra-items-tab";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MateriaisPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: items }, { data: phases }, { data: suppliers }] = await Promise.all([
    supabase.from("obra_items").select("*").eq("module_id", mod.id).order("created_at", { ascending: false }),
    supabase.from("obra_phases").select("id, name").eq("module_id", mod.id).order("position"),
    supabase.from("suppliers").select("id, name").eq("household_id", ctx.householdId).order("name"),
  ]);

  return (
    <div>
      <ObraSectionHeader title="Materiais" subtitle="Itens planejados e comprados" />
      <ObraItemsTab
        moduleId={mod.id}
        initial={(items ?? []) as never}
        phases={phases ?? []}
        suppliers={suppliers ?? []}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
