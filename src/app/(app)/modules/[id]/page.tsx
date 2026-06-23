import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { ModuleDetail } from "@/components/modules/module-detail";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params }: { params: { id: string } }) {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const { data: module } = await supabase
    .from("modules")
    .select("id, kind, name, status, budget")
    .eq("id", params.id)
    .eq("household_id", hid)
    .maybeSingle();

  if (!module) notFound();

  const [{ data: items }, { data: expenses }, { data: gallery }, { data: quotes }, { data: suppliers }, { data: diary }] =
    await Promise.all([
      supabase.from("module_items").select("id, title, item_type, planned_amount, status, done, due_date").eq("module_id", params.id).order("position"),
      supabase.from("transactions").select("id, description, amount, occurred_on").eq("module_id", params.id).eq("type", "expense").order("occurred_on", { ascending: false }),
      supabase.from("module_gallery").select("id, image_url, caption").eq("module_id", params.id).order("created_at", { ascending: false }),
      supabase.from("module_quotes").select("id, item, amount, unit, ai_min, ai_avg, ai_max, source, chosen, supplier_id").eq("module_id", params.id).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, name").eq("household_id", hid).order("name"),
      supabase.from("module_diary").select("id, entry_date, note, weather, workers, photo_url").eq("module_id", params.id).order("entry_date", { ascending: false }),
    ]);

  return (
    <ModuleDetail
      householdId={hid}
      module={module as any}
      items={items ?? []}
      expenses={expenses ?? []}
      gallery={gallery ?? []}
      quotes={quotes ?? []}
      suppliers={suppliers ?? []}
      diary={diary ?? []}
    />
  );
}
