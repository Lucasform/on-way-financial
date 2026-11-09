import "server-only";

import { messageText } from "@/lib/wa/message-text";
import { phoneKeyFromJid } from "@/lib/wa/phone";

// Cliente do servidor Evolution API v2 (ponte WhatsApp Web, não oficial).
// URL e chave do servidor ficam só no ambiente (EVOLUTION_API_URL / EVOLUTION_API_KEY), nunca no banco nem no front.

export type ConnectionState = "open" | "connecting" | "close";

export function isEvolutionConfigured(): boolean {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

async function call<T>(path: string, init: { method: "GET" | "POST" | "DELETE"; body?: unknown; timeoutMs?: number }): Promise<T> {
  const base = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  if (!base || !key) throw new Error("Servidor WhatsApp não configurado.");

  const res = await fetch(`${base}${path}`, {
    method: init.method,
    headers: { apikey: key, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    // servidor fora do ar não pode travar a tela nem o webhook
    signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) throw new EvolutionError(res.status, data);
  return data as T;
}

export class EvolutionError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(`Evolution API respondeu ${status}`);
  }

  /** Número sem WhatsApp vem como 400 com { response: { message: [{ exists: false }] } }. */
  get numberWithoutWhatsapp(): boolean {
    return JSON.stringify(this.payload ?? "").includes('"exists":false');
  }
}

/** Cria a instância se ainda não existir (o servidor responde erro quando já existe, e isso é esperado). */
export async function ensureInstance(instance: string) {
  try {
    await call("/instance/create", {
      method: "POST",
      body: { instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true },
    });
  } catch (err) {
    if (!(err instanceof EvolutionError) || (err.status !== 403 && err.status !== 409 && err.status !== 400)) throw err;
  }
}

export async function setWebhook(instance: string, url: string) {
  await call(`/webhook/set/${instance}`, {
    method: "POST",
    body: {
      webhook: { enabled: true, url, byEvents: false, base64: false, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"] },
    },
  });
}

/** QR (base64 pra usar direto no <img>) e código de pareamento. O QR expira em ~30s. */
export async function getQrCode(instance: string) {
  const data = await call<{ base64?: string; pairingCode?: string | null }>(`/instance/connect/${instance}`, {
    method: "GET",
  });
  return { qr: data?.base64 ?? null, pairingCode: data?.pairingCode ?? null };
}

export async function getConnectionState(instance: string): Promise<ConnectionState> {
  try {
    const data = await call<{ instance?: { state?: ConnectionState } }>(`/instance/connectionState/${instance}`, {
      method: "GET",
    });
    return data?.instance?.state ?? "close";
  } catch (err) {
    if (err instanceof EvolutionError && err.status === 404) return "close";
    throw err;
  }
}

export async function logoutInstance(instance: string) {
  try {
    await call(`/instance/logout/${instance}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof EvolutionError)) throw err;
  }
}

/** Conversas que o WhatsApp sincronizou ao conectar: servem pra saber quem já falava com o número antes do bot. */
export async function listChatJids(instance: string): Promise<string[]> {
  const data = await call<unknown>(`/chat/findChats/${instance}`, { method: "POST", body: {} });
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((c) => {
      const row = c as { remoteJid?: string; id?: string };
      return row.remoteJid ?? row.id ?? "";
    })
    .filter((jid) => jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));
}

export interface PhoneChat {
  jid: string;
  /** Chave da conversa no app: número com DDI ou "lid:<código>". */
  phoneKey: string;
  name: string | null;
  lastText: string | null;
  lastFromMe: boolean;
  updatedAt: string | null;
  unread: number;
}

/** Conversas individuais do celular, mais recentes primeiro (grupos ficam de fora). */
export async function listPhoneChats(instance: string): Promise<PhoneChat[]> {
  const data = await call<unknown>(`/chat/findChats/${instance}`, { method: "POST", body: {} });
  const rows = (Array.isArray(data) ? data : []) as {
    remoteJid?: string;
    pushName?: string | null;
    updatedAt?: string | null;
    unreadCount?: number | null;
    lastMessage?: {
      key?: { fromMe?: boolean; remoteJidAlt?: string; senderPn?: string };
      pushName?: string | null;
      message?: Record<string, unknown>;
      messageType?: string;
    } | null;
  }[];
  const chats: PhoneChat[] = [];
  for (const r of rows) {
    const jid = r.remoteJid ?? "";
    const last = r.lastMessage ?? null;
    const phoneKey = phoneKeyFromJid(jid, last?.key?.remoteJidAlt ?? last?.key?.senderPn);
    if (!phoneKey || jid === "status@broadcast") continue;
    const fromMe = Boolean(last?.key?.fromMe);
    // sem nome conhecido o servidor devolve o próprio código do contato; isso não é nome
    const realName = (n: string | null | undefined) => (n && !/^\+?\d+$/.test(n.trim()) ? n.trim() : null);
    chats.push({
      jid,
      phoneKey,
      name: realName(r.pushName) ?? (!fromMe ? realName(last?.pushName) : null),
      lastText: last ? messageText(last.message, last.messageType) : null,
      lastFromMe: fromMe,
      updatedAt: r.updatedAt ?? null,
      unread: Number(r.unreadCount ?? 0),
    });
  }
  return chats.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export interface HistoryMessage {
  id: string | null;
  fromMe: boolean;
  timestamp: number;
  message?: Record<string, unknown>;
  messageType?: string;
}

/** Últimas mensagens de uma conversa guardadas no servidor (inclui o que veio antes de conectar o app). */
export async function fetchHistory(instance: string, jid: string, limit = 30): Promise<HistoryMessage[]> {
  const data = await call<unknown>(`/chat/findMessages/${instance}`, {
    method: "POST",
    body: { where: { key: { remoteJid: jid } }, page: 1, offset: limit },
  });
  const box = data as { messages?: { records?: unknown[] } | unknown[] } | unknown[] | null;
  const records = Array.isArray(box)
    ? box
    : Array.isArray(box?.messages)
      ? box.messages
      : (box?.messages?.records ?? []);
  return records
    .map((r) => {
      const row = r as {
        key?: { id?: string; fromMe?: boolean };
        messageTimestamp?: number | string;
        message?: Record<string, unknown>;
        messageType?: string;
      };
      const ts = Number(row.messageTimestamp ?? 0);
      return {
        id: row.key?.id ?? null,
        fromMe: Boolean(row.key?.fromMe),
        // o servidor guarda em segundos; normaliza pra milissegundos
        timestamp: ts > 1e12 ? ts : ts * 1000,
        message: row.message,
        messageType: row.messageType,
      };
    })
    .filter((m) => m.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Envia texto e devolve o id da mensagem no WhatsApp (pra não duplicar quando o webhook ecoar o envio). */
export async function sendText(instance: string, phone: string, text: string): Promise<string | null> {
  const data = await call<{ key?: { id?: string } }>(`/message/sendText/${instance}`, {
    method: "POST",
    body: { number: phone, text },
  });
  return data?.key?.id ?? null;
}

export type MediaKind = "image" | "video" | "document";

export function mediaKindFor(mimetype: string | null | undefined): MediaKind {
  if (mimetype?.startsWith("image/")) return "image";
  if (mimetype?.startsWith("video/")) return "video";
  return "document";
}

/** Envia um arquivo pelo link público (o servidor baixa e manda). Devolve o id da mensagem no WhatsApp. */
export async function sendMedia(
  instance: string,
  phone: string,
  file: { url: string; fileName: string; mimetype: string; caption?: string | null },
): Promise<string | null> {
  const data = await call<{ key?: { id?: string } }>(`/message/sendMedia/${instance}`, {
    method: "POST",
    body: {
      number: phone,
      mediatype: mediaKindFor(file.mimetype),
      mimetype: file.mimetype,
      media: file.url,
      fileName: file.fileName,
      caption: file.caption ?? "",
    },
    timeoutMs: 55_000,
  });
  return data?.key?.id ?? null;
}
