import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraDiaryTab } from "@/components/modules/obra-diary-tab";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AndamentoPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: diary }, { data: phases }] = await Promise.all([
    supabase.from("obra_diary").select("*").eq("module_id", mod.id).order("entry_date", { ascending: false }),
    supabase.from("obra_phases").select("id, name").eq("module_id", mod.id).order("position"),
  ]);

  return (
    <div>
      <ObraSectionHeader title="Andamento" subtitle="Registre o progresso com fotos" />
      <ObraDiaryTab
        moduleId={mod.id}
        householdId={ctx.householdId}
        initial={(diary ?? []) as never}
        phases={phases ?? []}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
