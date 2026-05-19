import "server-only";

import { getServerEnv } from "@/lib/env";

const TG_API = "https://api.telegram.org";

function endpoint(method: string): string {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN não configurado");
  return `${TG_API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function call(method: string, body: unknown): Promise<unknown> {
  const res = await fetch(endpoint(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.statusText}`);
  return json.result;
}

export async function sendTelegramText(chatId: number | string, text: string): Promise<void> {
  await call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
}

export async function setTelegramWebhook(url: string, secret: string): Promise<unknown> {
  return call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function deleteTelegramWebhook(): Promise<unknown> {
  return call("deleteWebhook", { drop_pending_updates: true });
}

export async function getTelegramWebhookInfo(): Promise<unknown> {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN não configurado");
  const res = await fetch(`${TG_API}/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
  const json = (await res.json()) as { ok: boolean; result?: unknown };
  if (!json.ok) throw new Error("getWebhookInfo failed");
  return json.result;
}
