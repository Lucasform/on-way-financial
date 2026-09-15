import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraDocumentsTab } from "@/components/modules/obra-documents-tab";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const { data: docs } = await supabase
    .from("obra_documents")
    .select("id, name, file_url, file_type, size_bytes, created_at")
    .eq("module_id", mod.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <ObraSectionHeader title="Documentos" subtitle="Plantas, projetos e arquivos da obra" />
      <ObraDocumentsTab moduleId={mod.id} householdId={ctx.householdId} initial={docs ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
