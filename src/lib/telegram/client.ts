import { getServerEnv } from "@/lib/env";

function api(method: string) {
  const env = getServerEnv();
  if (!env.telegramToken) throw new Error("TELEGRAM_BOT_TOKEN ausente");
  return `https://api.telegram.org/bot${env.telegramToken}/${method}`;
}

export async function sendMessage(chatId: string | number, text: string) {
  const res = await fetch(api("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    cache: "no-store",
  });
  return res.json();
}

export function isConfigured(): boolean {
  return Boolean(getServerEnv().telegramToken);
}
