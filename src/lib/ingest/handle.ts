import { createAdminClient } from "@/lib/supabase/admin";
import { parseExpense } from "@/lib/ai/parse-expense";
import { brl } from "@/lib/utils";

type Channel = "telegram" | "whatsapp" | "ai_web";

export type IngestResult = {
  ok: boolean;
  reply: string;
  silent?: boolean; // não responder (ex: grupo não vinculado)
  transactionId?: string;
};

// Descobre o household para a mensagem. Suporta:
// - chat direto: mapeia pelo número/chat_id do membro
// - grupo de WhatsApp: usa o grupo já vinculado; senão, se o remetente for um
//   membro conhecido, vincula o grupo à casa dele (primeira mensagem registra).
async function resolveHousehold(
  channel: Channel,
  sender: string,
  groupJid?: string,
): Promise<{ householdId: string | null; bound: boolean }> {
  const db = createAdminClient();

  if (groupJid) {
    const { data: hh } = await db
      .from("households")
      .select("id")
      .eq("whatsapp_group_jid", groupJid)
      .maybeSingle();
    if (hh) return { householdId: hh.id, bound: false };

    // grupo novo: vincula se o remetente for membro conhecido
    const { data: member } = await db
      .from("household_members")
      .select("household_id")
      .eq("whatsapp_number", sender)
      .maybeSingle();
    if (!member) return { householdId: null, bound: false };
    await db.from("households").update({ whatsapp_group_jid: groupJid }).eq("id", member.household_id);
    return { householdId: member.household_id, bound: true };
  }

  const col = channel === "telegram" ? "telegram_chat_id" : "whatsapp_number";
  const { data } = await db
    .from("household_members")
    .select("household_id")
    .eq(col, sender)
    .maybeSingle();
  return { householdId: data?.household_id ?? null, bound: false };
}

export async function ingestMessage(
  channel: Channel,
  sender: string,
  text: string,
  opts?: { groupJid?: string },
): Promise<IngestResult> {
  const db = createAdminClient();
  const { householdId, bound } = await resolveHousehold(channel, sender, opts?.groupJid);

  if (!householdId) {
    // em grupo não vinculado, não respondemos para evitar spam
    if (opts?.groupJid) return { ok: false, reply: "", silent: true };
    return {
      ok: false,
      reply: "Número não vinculado. Abra o app em Configurações e cadastre seu WhatsApp.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: inbox } = await db
    .from("ingest_inbox")
    .insert({ household_id: householdId, channel, sender, raw_text: text, status: "pending" })
    .select("id")
    .single();

  let parsed;
  try {
    parsed = await parseExpense(text, today);
  } catch {
    await db.from("ingest_inbox").update({ status: "error" }).eq("id", inbox?.id);
    return { ok: false, reply: "Não consegui interpretar agora. Tenta de novo em instantes." };
  }

  if (!parsed) {
    await db.from("ingest_inbox").update({ status: "error" }).eq("id", inbox?.id);
    return { ok: false, reply: 'Não entendi o lançamento. Ex: "gastei 50 no mercado hoje".' };
  }

  const categoryId = parsed.category_hint
    ? (
        await db
          .from("categories")
          .select("id")
          .eq("household_id", householdId)
          .ilike("name", parsed.category_hint)
          .maybeSingle()
      ).data?.id ?? null
    : null;

  const { data: tx } = await db
    .from("transactions")
    .insert({
      household_id: householdId,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category_id: categoryId,
      occurred_on: parsed.occurred_on || today,
      source: channel === "telegram" ? "telegram" : "whatsapp",
      ai_confidence: parsed.confidence,
    })
    .select("id")
    .single();

  await db
    .from("ingest_inbox")
    .update({ status: "confirmed", parsed, transaction_id: tx?.id })
    .eq("id", inbox?.id);

  const verb = parsed.type === "income" ? "Entrada" : "Saída";
  const prefix = bound ? "🔗 Grupo vinculado!\n" : "";
  return {
    ok: true,
    transactionId: tx?.id,
    reply: `${prefix}✅ ${verb} registrada: *${brl(parsed.amount)}* — ${parsed.description}${
      parsed.category_hint ? ` (${parsed.category_hint})` : ""
    }`,
  };
}
