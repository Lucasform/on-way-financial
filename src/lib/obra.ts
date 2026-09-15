import { createSupabaseServer } from "@/lib/supabase/server";

export async function getObraModule(householdId: string) {
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("modules")
    .select("*")
    .eq("household_id", householdId)
    .eq("kind", "obra")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}
