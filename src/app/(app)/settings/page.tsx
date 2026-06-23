import { Card, CardTitle } from "@/components/ui/card";
import { ChannelSettings } from "@/components/channel-settings";
import { WhatsAppConnect } from "@/components/whatsapp-connect";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();

  const { data: member } = await supabase
    .from("household_members")
    .select("id, telegram_chat_id, whatsapp_number")
    .eq("user_id", ctx!.userId)
    .eq("household_id", ctx!.householdId!)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <Card>
        <CardTitle>Lançamento por chat</CardTitle>
        <p className="mt-1 text-sm text-fg-soft">
          Vincule seu WhatsApp e/ou Telegram para lançar despesas mandando mensagem.
        </p>
        <div className="mt-4">
          {member && (
            <ChannelSettings
              memberId={member.id}
              telegramChatId={member.telegram_chat_id}
              whatsappNumber={member.whatsapp_number}
              telegramUsername={process.env.TELEGRAM_BOT_USERNAME ?? null}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Conectar WhatsApp</CardTitle>
        <p className="mt-1 text-sm text-fg-soft">
          Pareie seu WhatsApp para lançar despesas por mensagem. Depois cadastre seu número acima.
        </p>
        <div className="mt-4">
          <WhatsAppConnect />
        </div>
      </Card>

      <Card>
        <CardTitle>Conexões bancárias</CardTitle>
        <p className="mt-1 text-sm text-fg-soft">
          Integração com Open Finance (Pluggy/Belvo) para sincronizar extratos.
          Em desenvolvimento — ver ROADMAP.
        </p>
      </Card>
    </div>
  );
}
