import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchHistory } from "@/lib/wa/evolution";
import { messageText } from "@/lib/wa/message-text";
import { isLidKey, samePhone } from "@/lib/wa/phone";
import type { Database } from "@/types/database";

type Admin = ReturnType<typeof createSupabaseAdmin>;
type Conversation = Database["public"]["Tables"]["wa_conversations"]["Row"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function preview(text: string) {
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

export function instanceNameFor(householdId: string) {
  return `onobra_${householdId.replace(/-/g, "").slice(0, 16)}`;
}

/** Conexão da obra; cria o registro na primeira vez. */
export async function connectionFor(admin: Admin, householdId: string) {
  const { data } = await admin.from("wa_connections").select("*").eq("household_id", householdId).maybeSingle();
  if (data) return data;
  const { data: created } = await admin
    .from("wa_connections")
    .upsert({ household_id: householdId, instance_name: instanceNameFor(householdId) }, { onConflict: "household_id" })
    .select("*")
    .single();
  return created;
}

/** Acha a conversa da obra pelo endereço do WhatsApp (o mesmo contato pode vir com número ou código interno). */
export async function findConversation(admin: Admin, householdId: string, phone: string, jid: string | null): Promise<Conversation | null> {
  if (jid) {
    const { data } = await admin
      .from("wa_conversations")
      .select("*")
      .eq("household_id", householdId)
      .eq("wa_jid", jid)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await admin.from("wa_conversations").select("*").eq("household_id", householdId).eq("phone", phone).maybeSingle();
  return data;
}

async function supplierByPhone(admin: Admin, householdId: string, phone: string) {
  if (isLidKey(phone)) return null;
  const { data } = await admin.from("suppliers").select("id, phone, phone2").eq("household_id", householdId);
  return data?.find((s) => samePhone(s.phone, phone) || samePhone(s.phone2, phone))?.id ?? null;
}

/** Mensagem que chegou. Só grava se a conversa já foi trazida pro app; as outras ficam só no celular. */
export async function recordInbound(
  admin: Admin,
  householdId: string,
  msg: { phone: string; jid: string | null; name: string | null; text: string; waMessageId: string | null },
) {
  const conversation = await findConversation(admin, householdId, msg.phone, msg.jid);
  if (!conversation) return false;
  const { error } = await admin.from("wa_messages").insert({
    household_id: householdId,
    conversation_id: conversation.id,
    direction: "in",
    content: msg.text,
    wa_message_id: msg.waMessageId,
  });
  if (error) return false;
  await admin
    .from("wa_conversations")
    .update({
      contact_name: msg.name || conversation.contact_name,
      wa_jid: conversation.wa_jid ?? msg.jid,
      last_message: preview(msg.text),
      last_message_at: new Date().toISOString(),
      unread: conversation.unread + 1,
    })
    .eq("id", conversation.id);
  return true;
}

export async function recordOutbound(admin: Admin, householdId: string, conversationId: string, content: string, waMessageId: string | null) {
  await admin
    .from("wa_messages")
    .insert({ household_id: householdId, conversation_id: conversationId, direction: "out", content, wa_message_id: waMessageId });
  await admin
    .from("wa_conversations")
    .update({ last_message: preview(content), last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

/**
 * Mensagem que saiu do celular conectado: pode ser eco de um envio feito pelo app (já gravado ou prestes a ser)
 * ou resposta digitada direto no celular. Só a segunda é gravada.
 */
export async function recordPhoneReply(
  admin: Admin,
  householdId: string,
  msg: { phone: string; jid: string | null; text: string; waMessageId: string | null },
) {
  const conversation = await findConversation(admin, householdId, msg.phone, msg.jid);
  if (!conversation) return;
  await sleep(3000);
  if (msg.waMessageId) {
    const { data: known } = await admin
      .from("wa_messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("wa_message_id", msg.waMessageId)
      .maybeSingle();
    if (known) return;
  }
  const since = new Date(Date.now() - 90_000).toISOString();
  const { data: sameText } = await admin
    .from("wa_messages")
    .select("id")
    .eq("conversation_id", conversation.id)
    .eq("direction", "out")
    .eq("content", msg.text)
    .gte("created_at", since)
    .limit(1);
  if (sameText?.length) return;
  await recordOutbound(admin, householdId, conversation.id, msg.text, msg.waMessageId);
}

/** Traz pro app as mensagens anteriores da conversa (trocadas antes de abrir aqui). */
export async function importHistory(admin: Admin, householdId: string, instance: string, conversationId: string) {
  const { data: conversation } = await admin
    .from("wa_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!conversation) return 0;

  const history = await fetchHistory(instance, conversation.wa_jid ?? `${conversation.phone}@s.whatsapp.net`, 50);
  const rows = history
    .map((m) => ({ m, text: messageText(m.message, m.messageType) }))
    .filter((x): x is { m: (typeof history)[number]; text: string } => Boolean(x.m.id && x.text))
    .map(({ m, text }) => ({
      household_id: householdId,
      conversation_id: conversation.id,
      direction: m.fromMe ? "out" : "in",
      content: text,
      wa_message_id: m.id,
      created_at: new Date(m.timestamp).toISOString(),
    }));
  if (rows.length) {
    await admin.from("wa_messages").upsert(rows, { onConflict: "conversation_id,wa_message_id", ignoreDuplicates: true });
  }
  const { data: last } = await admin
    .from("wa_messages")
    .select("content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  await admin
    .from("wa_conversations")
    .update({
      history_imported: true,
      ...(last && !conversation.last_message_at ? { last_message: preview(last.content), last_message_at: last.created_at } : {}),
    })
    .eq("id", conversation.id);
  return rows.length;
}

/**
 * Traz pro app uma conversa do celular (ou começa uma com um número). Cria o registro se ainda não existe,
 * liga ao fornecedor (escolhido ou pelo telefone) e importa o histórico.
 */
export async function openConversation(
  admin: Admin,
  householdId: string,
  instance: string,
  chat: { jid: string; phoneKey: string; name: string | null; supplierId?: string | null },
) {
  let conversation = await findConversation(admin, householdId, chat.phoneKey, chat.jid);
  if (!conversation) {
    const supplierId = chat.supplierId ?? (await supplierByPhone(admin, householdId, chat.phoneKey));
    const { data: created, error } = await admin
      .from("wa_conversations")
      .insert({ household_id: householdId, phone: chat.phoneKey, wa_jid: chat.jid, contact_name: chat.name, supplier_id: supplierId })
      .select("*")
      .single();
    conversation = error ? await findConversation(admin, householdId, chat.phoneKey, chat.jid) : created;
  } else if (chat.supplierId && !conversation.supplier_id) {
    await admin.from("wa_conversations").update({ supplier_id: chat.supplierId }).eq("id", conversation.id);
  }
  if (!conversation) throw new Error("Falha ao abrir a conversa.");
  if (!conversation.history_imported) {
    await importHistory(admin, householdId, instance, conversation.id).catch((err) => console.error("[wa] histórico", err));
  }
  return conversation.id;
}
