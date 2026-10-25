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

  const { data: diary } = await supabase
    .from("obra_diary")
    .select("*")
    .eq("module_id", mod.id)
    .order("entry_date", { ascending: false });

  return (
    <div>
      <ObraSectionHeader title="Andamento" subtitle="O álbum cronológico da obra, mês a mês" />
      <ObraDiaryTab
        moduleId={mod.id}
        householdId={ctx.householdId}
        initial={(diary ?? []) as never}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
