import { notFound } from "next/navigation";

import { ObraDashboard } from "@/components/modules/obra-dashboard";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ObraPage({ params }: { params: { id: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", params.id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (!mod) notFound();
  const [{ data: phases }, { data: workers }, { data: gallery }, { data: tx }] = await Promise.all([
    supabase.from("obra_phases").select("*").eq("module_id", params.id).order("position"),
    supabase.from("obra_workers").select("*").eq("module_id", params.id).order("name"),
    supabase.from("obra_gallery").select("*").eq("module_id", params.id).order("taken_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, amount, description, occurred_at, category_id, categories:categories(name,color)")
      .eq("household_id", ctx.householdId)
      .eq("module_id", params.id)
      .order("occurred_at", { ascending: false }),
  ]);

  return (
    <ObraDashboard
      module={mod}
      phases={phases ?? []}
      workers={workers ?? []}
      gallery={gallery ?? []}
      transactions={tx ?? []}
      householdId={ctx.householdId}
      userId={ctx.userId}
      canWrite={ctx.role !== "viewer"}
    />
  );
}
