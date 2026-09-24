import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraDocumentsTab } from "@/components/modules/obra-documents-tab";
import type { ObraFolder } from "@/components/modules/obra-folders";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: docs }, { data: folders }] = await Promise.all([
    supabase
      .from("obra_documents")
      .select("id, name, file_url, file_type, size_bytes, created_at, folder_id")
      .eq("module_id", mod.id)
      .order("created_at", { ascending: false }),
    supabase.from("obra_folders").select("id, name, kind").eq("module_id", mod.id).eq("kind", "document").order("name"),
  ]);
  const documentFolders = (folders ?? []) as ObraFolder[];

  return (
    <div>
      <ObraSectionHeader title="Documentos" subtitle="Plantas, projetos e arquivos da obra" />
      <ObraDocumentsTab
        moduleId={mod.id}
        householdId={ctx.householdId}
        initial={docs ?? []}
        initialFolders={documentFolders}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
