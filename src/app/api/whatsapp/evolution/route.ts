import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { recordInbound, recordPhoneReply } from "@/lib/wa/inbox";
import { messageText } from "@/lib/wa/message-text";
import { phoneKeyFromJid } from "@/lib/wa/phone";

// Webhook público chamado pelo servidor Evolution. Cada obra tem a sua instância e o seu segredo na URL.
export const runtime = "nodejs";
export const maxDuration = 60;

interface EvolutionMessage {
  key?: { remoteJid?: string; remoteJidAlt?: string; senderPn?: string; fromMe?: boolean; id?: string };
  pushName?: string;
  messageType?: string;
  message?: Record<string, unknown>;
}

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret") ?? "";
  if (secret.length < 32) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data: connection } = await admin
    .from("wa_connections")
    .select("household_id, instance_name")
    .eq("webhook_secret", secret)
    .maybeSingle();
  if (!connection) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { event?: string; data?: unknown } | null;
  const event = (body?.event ?? "").toLowerCase().replace(/_/g, ".");

  if (event === "connection.update") {
    const state = (body?.data as { state?: string } | undefined)?.state;
    const status = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
    await admin.from("wa_connections").update({ status, updated_at: new Date().toISOString() }).eq("household_id", connection.household_id);
    return NextResponse.json({ ok: true });
  }

  if (event !== "messages.upsert") return NextResponse.json({ ok: true, ignored: event });

  const items = (Array.isArray(body?.data) ? body.data : [body?.data]) as EvolutionMessage[];
  for (const data of items) {
    if (!data?.key) continue;
    const phone = phoneKeyFromJid(data.key.remoteJid, data.key.remoteJidAlt ?? data.key.senderPn);
    const text = data.messageType === "reactionMessage" ? null : messageText(data.message, data.messageType);
    if (!phone || !text) continue;
    const msg = { phone, jid: data.key.remoteJid ?? null, text, waMessageId: data.key.id ?? null };
    if (data.key.fromMe) await recordPhoneReply(admin, connection.household_id, msg);
    else await recordInbound(admin, connection.household_id, { ...msg, name: data.pushName ?? null });
  }
  return NextResponse.json({ ok: true });
}
