import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { ingestMessage } from "@/lib/ingest/handle";
import { sendMessage } from "@/lib/telegram/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const env = getServerEnv();
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (env.telegramWebhookSecret && secret !== env.telegramWebhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const chatId = msg?.chat?.id;
  const text: string | undefined = msg?.text;
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const result = await ingestMessage("telegram", String(chatId), text);
  await sendMessage(chatId, result.reply).catch(() => {});
  return NextResponse.json({ ok: true });
}
