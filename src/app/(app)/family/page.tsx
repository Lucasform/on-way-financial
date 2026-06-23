import { Card, CardTitle } from "@/components/ui/card";
import { HouseholdRename } from "@/components/family-client";
import { InviteManager } from "@/components/invite-manager";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { getPublicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const ROLE_PT: Record<string, string> = { owner: "Dono", admin: "Admin", member: "Membro", viewer: "Visualizador" };

export default async function FamilyPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("household_members")
      .select("id, display_name, role, whatsapp_number")
      .eq("household_id", hid)
      .order("created_at"),
    supabase
      .from("household_invites")
      .select("id, email, role, token, accepted")
      .eq("household_id", hid)
      .order("created_at", { ascending: false }),
  ]);
  const appUrl = getPublicEnv().appUrl;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Família</h1>

      <Card>
        <CardTitle>Identificação</CardTitle>
        <div className="mt-4">
          <HouseholdRename householdId={hid} name={ctx!.householdName ?? "Minha casa"} />
        </div>
      </Card>

      <Card>
        <CardTitle>Membros</CardTitle>
        <ul className="mt-3 divide-y divide-border">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{m.display_name || "Membro"}</p>
                {m.whatsapp_number && <p className="text-xs text-muted">WhatsApp {m.whatsapp_number}</p>}
              </div>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft">
                {ROLE_PT[m.role] ?? m.role}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Convidar para a família</CardTitle>
        <p className="mb-3 mt-1 text-sm text-fg-soft">
          Gere um link e mande para sua esposa ou familiar entrar e compartilhar as finanças.
        </p>
        <InviteManager householdId={hid} invites={invites ?? []} appUrl={appUrl} />
      </Card>

      <Card>
        <CardTitle>Compartilhar por grupo de WhatsApp</CardTitle>
        <p className="mt-1 text-sm text-fg-soft">
          Crie um grupo no WhatsApp com você e sua esposa e mande a primeira mensagem por lá
          (ex: “gastei 50 no mercado”). O grupo é vinculado automaticamente à sua família e os
          dois passam a lançar pelo grupo. Requer seu WhatsApp conectado em Configurações.
        </p>
      </Card>
    </div>
  );
}
