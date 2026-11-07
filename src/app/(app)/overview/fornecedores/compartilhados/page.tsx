import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { SharedSuppliersView } from "@/components/modules/shared-suppliers-view";
import { SupplierTabs } from "@/components/modules/supplier-tabs";
import { loadActiveContext } from "@/lib/household";
import { getObraModule } from "@/lib/obra";
import { loadSharedDirectory } from "@/lib/shared-suppliers";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompartilhadosPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [directory, { data: mine }] = await Promise.all([
    loadSharedDirectory(ctx.householdId, user?.email ?? null),
    supabase.from("suppliers").select("id, name, category, shared").eq("household_id", ctx.householdId).order("name"),
  ]);

  return (
    <div>
      <ObraSectionHeader title="Fornecedores" subtitle="Troque fornecedores com outras obras conectadas" />
      <SupplierTabs active="compartilhados" />
      <SharedSuppliersView directory={directory} mine={mine ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
