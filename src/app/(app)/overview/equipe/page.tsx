import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { WorkersPanel } from "@/components/modules/obra-dashboard";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const { data: workers } = await supabase.from("obra_workers").select("*").eq("module_id", mod.id).order("name");

  return (
    <div>
      <ObraSectionHeader title="Equipe" subtitle="Trabalhadores e mensagens por WhatsApp" />
      <WorkersPanel moduleId={mod.id} initial={workers ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
