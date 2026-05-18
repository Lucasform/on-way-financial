import { AlertManager } from "@/components/common/alert-manager";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const [{ data: alerts }, { data: categories }, { data: members }] = await Promise.all([
    supabase.from("alerts").select("*").eq("household_id", ctx.householdId).order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name").eq("household_id", ctx.householdId).order("name"),
    supabase
      .from("household_members")
      .select("id, display_name, whatsapp_phone")
      .eq("household_id", ctx.householdId),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Alertas</h1>
        <p className="text-sm text-text-muted">Receba avisos no WhatsApp quando algo importante acontecer.</p>
      </header>
      <AlertManager
        householdId={ctx.householdId}
        userId={ctx.userId}
        canWrite={ctx.role !== "viewer"}
        initial={alerts ?? []}
        categories={categories ?? []}
        members={members ?? []}
      />
    </div>
  );
}
