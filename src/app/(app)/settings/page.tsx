import { SettingsPanel } from "@/components/common/settings-panel";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data: me } = await supabase
    .from("household_members")
    .select("id, display_name, whatsapp_phone, telegram_chat_id, telegram_username")
    .eq("household_id", ctx.householdId)
    .eq("user_id", ctx.userId)
    .single();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
      </header>
      <SettingsPanel
        memberId={me?.id ?? ""}
        displayName={me?.display_name ?? ""}
        whatsappPhone={me?.whatsapp_phone ?? ""}
        telegramChatId={me?.telegram_chat_id ?? null}
        telegramUsername={me?.telegram_username ?? null}
        householdId={ctx.householdId}
      />
    </div>
  );
}
