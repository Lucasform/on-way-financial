import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraQuotesTab } from "@/components/modules/obra-quotes-tab";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CotacoesPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: quotes }, { data: suppliers }] = await Promise.all([
    supabase.from("price_quotes").select("*").eq("household_id", ctx.householdId).order("quoted_at", { ascending: false }),
    supabase.from("suppliers").select("*").eq("household_id", ctx.householdId).order("name"),
  ]);

  return (
    <div>
      <ObraSectionHeader title="Cotações" subtitle="Compare preços entre fornecedores" />
      <ObraQuotesTab householdId={ctx.householdId} suppliers={suppliers ?? []} initial={quotes ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
