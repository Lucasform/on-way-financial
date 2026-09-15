import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraSuppliersTab } from "@/components/modules/obra-suppliers-tab";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const { data: suppliers } = await supabase.from("suppliers").select("*").eq("household_id", ctx.householdId).order("name");

  return (
    <div>
      <ObraSectionHeader title="Fornecedores" subtitle="Toque num fornecedor pra ver orçamentos e histórico" />
      <ObraSuppliersTab householdId={ctx.householdId} initial={suppliers ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
