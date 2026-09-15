import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { Gallery } from "@/components/modules/obra-dashboard";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GaleriaPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const { data: gallery } = await supabase
    .from("obra_gallery")
    .select("*")
    .eq("module_id", mod.id)
    .order("taken_at", { ascending: false });

  return (
    <div>
      <ObraSectionHeader title="Galeria" subtitle="Fotos e vídeos da obra" />
      <Gallery moduleId={mod.id} householdId={ctx.householdId} initial={gallery ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
