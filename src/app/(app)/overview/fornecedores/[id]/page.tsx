import { notFound, redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraSupplierDetail } from "@/components/modules/obra-supplier-detail";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", params.id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (!supplier) notFound();

  const [{ data: quotes }, { data: purchases }] = await Promise.all([
    supabase
      .from("price_quotes")
      .select("id, item_name, unit, unit_price, quoted_at")
      .eq("household_id", ctx.householdId)
      .eq("supplier_id", params.id)
      .order("quoted_at", { ascending: false }),
    supabase
      .from("obra_items")
      .select("id, name, quantity, unit, unit_price, actual_unit_price, status, bought_at")
      .eq("module_id", mod.id)
      .eq("supplier_id", params.id)
      .in("status", ["bought", "installed"])
      .order("bought_at", { ascending: false }),
  ]);

  return (
    <div>
      <ObraSectionHeader title={supplier.name} subtitle="Orçamentos e histórico de compras" />
      <ObraSupplierDetail
        supplier={supplier}
        quotes={quotes ?? []}
        purchases={(purchases ?? []) as never}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
