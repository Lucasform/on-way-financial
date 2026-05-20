import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { handleTelegramUpdate } from "@/lib/telegram/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const env = getServerEnv();
  if (!env.TELEGRAM_WEBHOOK_SECRET || !env.TELEGRAM_BOT_TOKEN) {
    return new NextResponse("telegram not configured", { status: 503 });
  }
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("forbidden", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // Processa síncrono (serverless mata processos fire-and-forget após o response)
  try {
    await handleTelegramUpdate(payload as Parameters<typeof handleTelegramUpdate>[0]);
  } catch (err) {
    console.error("Telegram handler error", err);
  }
  return new NextResponse("ok", { status: 200 });
}
