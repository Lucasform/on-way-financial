import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraForecastTab } from "@/components/modules/obra-forecast-tab";
import { ObraForecastEditor } from "@/components/modules/obra-forecast-editor";
import { ObraForecastImport } from "@/components/modules/obra-forecast-import";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PrevisaoPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: items }, { data: phases }, { data: tx }] = await Promise.all([
    supabase.from("obra_items").select("*").eq("module_id", mod.id).order("created_at", { ascending: false }),
    supabase.from("obra_phases").select("*").eq("module_id", mod.id).order("position"),
    supabase
      .from("transactions")
      .select("amount")
      .eq("household_id", ctx.householdId)
      .eq("module_id", mod.id)
      .eq("type", "expense"),
  ]);
  const spent = (tx ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const canWrite = ctx.role !== "viewer";

  return (
    <div>
      <ObraSectionHeader title="Previsão" subtitle="Orçamento planejado x realizado" />
      <div className="space-y-4">
        {canWrite && <ObraForecastImport moduleId={mod.id} />}
        <ObraForecastEditor initial={phases ?? []} canWrite={canWrite} />
        <ObraForecastTab budget={mod.budget} spent={spent} items={(items ?? []) as never} phases={(phases ?? []) as never} />
      </div>
    </div>
  );
}
