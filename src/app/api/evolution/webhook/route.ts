import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { ingestMessage } from "@/lib/ingest/handle";
import { sendText } from "@/lib/evolution/client";

export const runtime = "nodejs";

// Webhook da Evolution API. Evento MESSAGES_UPSERT.
export async function POST(req: NextRequest) {
  const env = getServerEnv();
  const secret = req.nextUrl.searchParams.get("secret");
  if (env.evolutionWebhookSecret && secret !== env.evolutionWebhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const data = body?.data;
  if (body?.event !== "messages.upsert" || !data) {
    return NextResponse.json({ ok: true });
  }

  const remoteJid: string | undefined = data.key?.remoteJid;
  const fromMe: boolean = Boolean(data.key?.fromMe);
  const ownerJid: string | undefined = body?.sender;
  const isGroup = !!remoteJid && remoteJid.endsWith("@g.us");

  const text: string | undefined =
    data.message?.conversation || data.message?.extendedTextMessage?.text;
  if (!remoteJid || !text) return NextResponse.json({ ok: true });

  let result;
  if (isGroup) {
    // grupo: remetente real vem em participant; processa de todos os membros.
    const participant: string | undefined = data.key?.participant;
    const senderNumber = (participant || "").split("@")[0];
    result = await ingestMessage("whatsapp", senderNumber, text, { groupJid: remoteJid });
  } else {
    // chat direto: aceita recebidas (bot) ou "Mensagem para mim" (self chat).
    const isSelfChat = !!ownerJid && remoteJid === ownerJid;
    if (fromMe && !isSelfChat) return NextResponse.json({ ok: true });
    const number = remoteJid.split("@")[0];
    result = await ingestMessage("whatsapp", number, text);
  }

  if (!result.silent && result.reply) await sendText(remoteJid, result.reply).catch(() => {});
  return NextResponse.json({ ok: true });
}
