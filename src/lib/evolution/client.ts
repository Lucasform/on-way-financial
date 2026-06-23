import { getServerEnv } from "@/lib/env";

// Cliente mínimo da Evolution API (WhatsApp). Reuso do blueprint OnWay:
// 1 servidor Railway multi-instância, QR self-service, webhook de mensagens.

function base() {
  const env = getServerEnv();
  if (!env.evolutionUrl || !env.evolutionKey || !env.evolutionInstance) {
    throw new Error("Evolution API não configurada");
  }
  return {
    url: env.evolutionUrl.replace(/\/$/, ""),
    key: env.evolutionKey,
    instance: env.evolutionInstance,
  };
}

async function call(path: string, init?: RequestInit) {
  const { url, key } = base();
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Evolution ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function sendText(to: string, text: string) {
  const { instance } = base();
  return call(`/message/sendText/${instance}`, {
    method: "POST",
    body: JSON.stringify({ number: to, text }),
  });
}

export async function fetchInstanceStatus() {
  const { instance } = base();
  return call(`/instance/connectionState/${instance}`);
}

export async function fetchQrCode() {
  const { instance } = base();
  return call(`/instance/connect/${instance}`);
}

export function isConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.evolutionUrl && env.evolutionKey && env.evolutionInstance);
}
