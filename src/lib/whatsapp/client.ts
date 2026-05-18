import "server-only";

import { getServerEnv } from "@/lib/env";

const API_VERSION = "v20.0";

function endpoint(): string {
  const env = getServerEnv();
  return `https://graph.facebook.com/${API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

async function postWA(body: unknown): Promise<void> {
  const env = getServerEnv();
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${text}`);
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  await postWA({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body, preview_url: false },
  });
}

export async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<void> {
  await postWA({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}
