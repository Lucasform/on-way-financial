import { FamilyManager } from "@/components/common/family-manager";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("household_members")
      .select("id, user_id, role, display_name, whatsapp_phone, created_at")
      .eq("household_id", ctx.householdId)
      .order("role"),
    supabase
      .from("household_invites")
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .eq("household_id", ctx.householdId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Família</h1>
        <p className="text-sm text-text-muted">Gerencie membros, papéis e convites.</p>
      </header>
      <FamilyManager
        householdId={ctx.householdId}
        currentRole={ctx.role}
        members={members ?? []}
        invites={invites ?? []}
      />
    </div>
  );
}
