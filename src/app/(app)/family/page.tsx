import { FamilyManager } from "@/components/common/family-manager";
import { SettingsPanel } from "@/components/common/settings-panel";
import { canWrite, loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const [{ data: members }, { data: invites }, { data: me }, { data: household }] = await Promise.all([
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
    supabase
      .from("household_members")
      .select("id, display_name, whatsapp_phone")
      .eq("household_id", ctx.householdId)
      .eq("user_id", ctx.userId)
      .single(),
    supabase.from("households").select("default_whatsapp_phone").eq("id", ctx.householdId).single(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Família</h1>
        <p className="text-sm text-text-muted">Convide pessoas pra ver e lançar transações junto com você.</p>
      </header>
      <FamilyManager
        householdId={ctx.householdId}
        currentRole={ctx.role}
        members={members ?? []}
        invites={invites ?? []}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Configurações</h2>
        <SettingsPanel
          memberId={me?.id ?? ""}
          displayName={me?.display_name ?? ""}
          whatsappPhone={me?.whatsapp_phone ?? ""}
          householdId={ctx.householdId}
          defaultWhatsapp={household?.default_whatsapp_phone}
          canConfigureHousehold={canWrite(ctx.role)}
        />
      </div>
    </div>
  );
}
