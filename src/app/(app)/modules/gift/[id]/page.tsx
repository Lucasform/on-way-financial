import { notFound } from "next/navigation";

import { GiftDashboard } from "@/components/modules/gift-dashboard";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GiftPage({ params }: { params: { id: string } }) {
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
    .from("gift_items")
    .select("*")
    .eq("module_id", params.id)
    .order("occasion_date", { ascending: true });
  return <GiftDashboard module={mod} items={items ?? []} canWrite={ctx.role !== "viewer"} />;
}
