import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraActivitiesTab } from "@/components/modules/obra-activities-tab";
import { DEFAULT_CHECKLIST } from "@/lib/obra-checklist-template";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AtividadesPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");
  const canWrite = ctx.role !== "viewer";

  const [{ data: activities }, checklistResult] = await Promise.all([
    supabase.from("obra_activities").select("*").eq("module_id", mod.id).order("created_at"),
    supabase.from("obra_checklist_items").select("*").eq("module_id", mod.id).order("position"),
  ]);

  let checklist = checklistResult.data;
  if ((checklist ?? []).length === 0 && canWrite) {
    const seed = DEFAULT_CHECKLIST.map((it, i) => ({
      module_id: mod.id,
      phase_name: it.phase_name,
      category: it.category,
      name: it.name,
      unit: it.unit ?? null,
      position: i,
    }));
    const { data: inserted } = await supabase.from("obra_checklist_items").insert(seed).select("*");
    checklist = inserted ?? [];
  }

  return (
    <div>
      <ObraSectionHeader title="Atividades" subtitle="O que você precisa fechar, com data, até concluir" />
      <ObraActivitiesTab
        moduleId={mod.id}
        initialActivities={(activities ?? []) as never}
        initialChecklist={(checklist ?? []) as never}
        canWrite={canWrite}
      />
    </div>
  );
}
