import { notFound } from "next/navigation";

import { CustomDashboard } from "@/components/modules/custom-dashboard";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CustomPage({ params }: { params: { id: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", params.id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (!mod) notFound();
  const { data: items } = await supabase
    .from("custom_items")
    .select("*")
    .eq("module_id", params.id)
    .order("position");
  return <CustomDashboard module={mod} items={items ?? []} canWrite={ctx.role !== "viewer"} />;
}
