"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ChannelSettings({
  memberId,
  telegramChatId,
  whatsappNumber,
  telegramUsername,
}: {
  memberId: string;
  telegramChatId: string | null;
  whatsappNumber: string | null;
  telegramUsername: string | null;
}) {
  const router = useRouter();
  const [tg, setTg] = useState(telegramChatId ?? "");
  const [wa, setWa] = useState(whatsappNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("household_members")
      .update({
        telegram_chat_id: tg.trim() || null,
        whatsapp_number: wa.replace(/\D/g, "") || null,
      })
      .eq("id", memberId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">WhatsApp (Evolution API)</label>
        <p className="mb-2 text-xs text-muted">
          Número com DDI/DDD, só dígitos. Ex: 5519999998888.
        </p>
        <input
          value={wa}
          onChange={(e) => setWa(e.target.value)}
          placeholder="5519999998888"
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Telegram chat ID</label>
        <p className="mb-2 text-xs text-muted">
          {telegramUsername ? (
            <>
              Fale com{" "}
              <a
                className="text-brand underline"
                href={`https://t.me/${telegramUsername}`}
                target="_blank"
              >
                @{telegramUsername}
              </a>{" "}
              e cole seu chat ID aqui.
            </>
          ) : (
            "Configure TELEGRAM_BOT_USERNAME para ativar o link direto."
          )}
        </p>
        <input
          value={tg}
          onChange={(e) => setTg(e.target.value)}
          placeholder="123456789"
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? "Salvo" : "Salvar canais"}
      </button>
    </div>
  );
}
