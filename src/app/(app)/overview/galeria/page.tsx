import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { Gallery } from "@/components/modules/obra-dashboard";
import type { ObraFolder } from "@/components/modules/obra-folders";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GaleriaPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: gallery }, { data: folders }] = await Promise.all([
    supabase.from("obra_gallery").select("*").eq("module_id", mod.id).order("taken_at", { ascending: false }),
    supabase.from("obra_folders").select("id, name, kind").eq("module_id", mod.id).eq("kind", "gallery").order("name"),
  ]);

  const galleryFolders = (folders ?? []) as ObraFolder[];

  return (
    <div>
      <ObraSectionHeader title="Galeria" subtitle="Fotos e vídeos da obra" />
      <Gallery
        moduleId={mod.id}
        householdId={ctx.householdId}
        initial={gallery ?? []}
        initialFolders={galleryFolders}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
