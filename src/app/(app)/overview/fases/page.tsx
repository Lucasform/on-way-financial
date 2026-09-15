import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { PhasesKanban } from "@/components/modules/obra-dashboard";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FasesPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const { data: phases } = await supabase.from("obra_phases").select("*").eq("module_id", mod.id).order("position");

  return (
    <div>
      <ObraSectionHeader title="Fases" subtitle="Arraste entre as colunas pra mover" />
      <PhasesKanban moduleId={mod.id} phases={phases ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
