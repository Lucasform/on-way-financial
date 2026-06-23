import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { ProjectDetail } from "@/components/obra/project-detail";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const { data: project } = await supabase
    .from("construction_projects")
    .select("*")
    .eq("id", params.id)
    .eq("household_id", hid)
    .maybeSingle();

  if (!project) notFound();

  const [{ data: phases }, { data: items }, { data: expenses }, { data: docs }] = await Promise.all([
    supabase.from("construction_phases").select("*").eq("project_id", params.id).order("sort_order"),
    supabase.from("construction_budget_items").select("*").eq("project_id", params.id).order("created_at"),
    supabase.from("construction_expenses").select("*").eq("project_id", params.id).order("occurred_on", { ascending: false }),
    supabase.from("construction_documents").select("*").eq("project_id", params.id).order("created_at", { ascending: false }),
  ]);

  return (
    <ProjectDetail
      householdId={hid}
      project={project}
      phases={phases ?? []}
      items={items ?? []}
      expenses={expenses ?? []}
      docs={docs ?? []}
    />
  );
}
