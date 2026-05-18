import { notFound } from "next/navigation";

import { EducationDashboard } from "@/components/modules/education-dashboard";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EducationPage({ params }: { params: { id: string } }) {
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
    .from("education_items")
    .select("*")
    .eq("module_id", params.id)
    .order("start_date", { ascending: true });
  return <EducationDashboard module={mod} items={items ?? []} canWrite={ctx.role !== "viewer"} />;
}
