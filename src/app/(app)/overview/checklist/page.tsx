import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraChecklistTab } from "@/components/modules/obra-checklist-tab";
import { DEFAULT_CHECKLIST } from "@/lib/obra-checklist-template";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");
  const canWrite = ctx.role !== "viewer";

  let { data: items } = await supabase
    .from("obra_checklist_items")
    .select("*")
    .eq("module_id", mod.id)
    .order("position");

  if ((items ?? []).length === 0 && canWrite) {
    const seed = DEFAULT_CHECKLIST.map((it, i) => ({
      module_id: mod.id,
      phase_name: it.phase_name,
      category: it.category,
      name: it.name,
      unit: it.unit ?? null,
      position: i,
    }));
    const { data: inserted } = await supabase.from("obra_checklist_items").insert(seed).select("*");
    items = inserted ?? [];
  }

  return (
    <div>
      <ObraSectionHeader title="Checklist da obra" subtitle="Processos, serviços e materiais por fase" />
      <ObraChecklistTab moduleId={mod.id} initial={(items ?? []) as never} canWrite={canWrite} />
    </div>
  );
}
