import "server-only";

import { parseCommand, parseFreeText, type ParsedIntent } from "@/lib/ai/parser";
import { todayISO } from "@/lib/dates";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import {
  balanceMessage,
  confirmTransaction,
  helpMessage,
  lowConfidenceMessage,
  notLinkedMessage,
} from "@/lib/whatsapp/templates";
import { monthRangeISO } from "@/lib/dates";
import { formatBRL } from "@/lib/money";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const UNDO_WINDOW_MIN = 5;

interface WAMessage {
  from: string;
  type: string;
  text?: { body: string };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
  id: string;
  timestamp: string;
}

interface WAPayload {
  object?: string;
  entry?: {
    changes?: {
      value?: {
        messages?: WAMessage[];
        contacts?: { wa_id: string; profile?: { name?: string } }[];
      };
    }[];
  }[];
}

export async function handleIncoming(payload: WAPayload): Promise<void> {
  const messages = payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];
  for (const msg of messages) {
    try {
      await processMessage(msg);
    } catch (err) {
      console.error("WA processMessage error", err);
    }
  }
}

async function processMessage(msg: WAMessage): Promise<void> {
  const from = normalizePhoneE164(msg.from);
  const body =
    msg.text?.body?.trim() ??
    msg.interactive?.button_reply?.title?.trim() ??
    "";

  if (!body) return;
  const env = getPublicEnv();

  if (await isRateLimited(from)) {
    await sendWhatsAppText(from, "⏳ Muitas mensagens em pouco tempo. Aguarde alguns segundos e tente de novo.");
    return;
  }

  const member = await findMember(from);
  if (!member) {
    await sendWhatsAppText(from, notLinkedMessage(env.NEXT_PUBLIC_APP_URL));
    return;
  }

  // Tentar comando estruturado primeiro
  const command = parseCommand(body);
  if (command && "command" in command) {
    await runSlashCommand(member.household_id, from, command.command, command.rest);
    return;
  }
  if (command && "intent" in command) {
    await handleParsedIntent(member, from, command);
    return;
  }

  // Caso "SIM/NÃO" para confirmação pendente
  if (/^(sim|s|confirmo|ok)$/i.test(body)) {
    await consumePendingConfirmation(from, true);
    return;
  }
  if (/^(n[ãa]o|n|cancelar)$/i.test(body)) {
    await consumePendingConfirmation(from, false);
    return;
  }

  // Texto livre → IA
  const parsed = await parseFreeText(body);
  await handleParsedIntent(member, from, parsed);
}

async function handleParsedIntent(
  member: MemberRef,
  from: string,
  parsed: ParsedIntent,
): Promise<void> {
  if (parsed.intent === "query_balance") {
    await sendBalance(member.household_id, from);
    return;
  }

  if (parsed.intent === "unknown" || parsed.amount == null) {
    await sendWhatsAppText(from, "🤖 Não consegui entender. Tenta `/ajuda` para ver os comandos.");
    return;
  }

  if (parsed.confidence < 0.7) {
    await stashPendingConfirmation(from, member, parsed);
    await sendWhatsAppText(
      from,
      lowConfidenceMessage({
        amount: parsed.amount,
        categoryHint: parsed.category_hint,
        paymentHint: parsed.payment_hint,
      }),
    );
    return;
  }

  await createTransactionFromParsed(member, from, parsed);
}

async function createTransactionFromParsed(
  member: MemberRef,
  from: string,
  parsed: ParsedIntent,
): Promise<void> {
  if (parsed.amount == null) return;
  const admin = createSupabaseAdmin();
  const occurredAt = parsed.occurred_at ?? todayISO();

  const categoryId = await resolveCategory(member.household_id, parsed.category_hint, parsed.intent);
  const paymentMethodId = await resolvePaymentMethod(member.household_id, parsed.payment_hint);
  const moduleRef = parsed.module_hint
    ? await findActiveModule(member.household_id, parsed.module_hint)
    : null;

  const { data: tx, error } = await admin
    .from("transactions")
    .insert({
      household_id: member.household_id,
      type: parsed.intent === "income" ? "income" : "expense",
      amount: parsed.amount,
      description: parsed.description,
      occurred_at: occurredAt,
      category_id: categoryId,
      payment_method_id: paymentMethodId,
      module_kind: moduleRef?.kind ?? null,
      module_id: moduleRef?.id ?? null,
      source: "whatsapp",
      created_by: member.user_id,
    })
    .select("id")
    .single();

  if (error || !tx) {
    console.error("Insert WA tx error", error);
    await sendWhatsAppText(from, "❌ Não consegui registrar agora. Tenta de novo em instantes.");
    return;
  }

  await admin.from("whatsapp_sessions").upsert({
    phone: from,
    member_id: member.id,
    household_id: member.household_id,
    state: { last_tx_id: tx.id, last_tx_at: new Date().toISOString() },
    last_message_at: new Date().toISOString(),
  });

  const [{ data: cat }, { data: pay }] = await Promise.all([
    categoryId
      ? admin.from("categories").select("name").eq("id", categoryId).maybeSingle()
      : Promise.resolve({ data: null }),
    paymentMethodId
      ? admin.from("payment_methods").select("name").eq("id", paymentMethodId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  await sendWhatsAppText(
    from,
    confirmTransaction({
      type: parsed.intent === "income" ? "income" : "expense",
      amount: parsed.amount,
      description: parsed.description,
      categoryName: cat?.name ?? null,
      paymentName: pay?.name ?? null,
      occurredAt,
    }),
  );

  // Alertas em tempo real: despesa grande
  if (parsed.intent === "expense") {
    await dispatchLargeExpenseAlert(member.household_id, parsed.amount).catch((e) =>
      console.error("largeExpenseAlert", e),
    );
  }
}

async function runSlashCommand(
  householdId: string,
  from: string,
  command: string,
  _rest: string,
): Promise<void> {
  switch (command) {
    case "ajuda":
    case "help":
      await sendWhatsAppText(from, helpMessage());
      return;
    case "saldo":
      await sendBalance(householdId, from);
      return;
    case "categorias":
      await sendCategories(householdId, from);
      return;
    case "metodos":
    case "métodos":
      await sendPaymentMethods(householdId, from);
      return;
    case "cancelar":
      await undoLastTx(householdId, from);
      return;
    default:
      await sendWhatsAppText(from, `🤖 Comando \`/${command}\` não reconhecido. Digite \`/ajuda\`.`);
  }
}

async function sendBalance(householdId: string, from: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { start, end } = monthRangeISO();
  const { data } = await admin
    .from("transactions")
    .select("type, amount, category_id, categories:categories(name)")
    .eq("household_id", householdId)
    .gte("occurred_at", start)
    .lte("occurred_at", end);

  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const tx of data ?? []) {
    const amt = Number(tx.amount);
    if (tx.type === "income") income += amt;
    if (tx.type === "expense") {
      expense += amt;
      const name = (tx as { categories: { name: string } | null }).categories?.name ?? "Outros";
      byCategory.set(name, (byCategory.get(name) ?? 0) + amt);
    }
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  await sendWhatsAppText(
    from,
    balanceMessage({
      income,
      expense,
      topCategory: top ? { name: top[0], total: top[1] } : null,
    }),
  );
}

async function sendCategories(householdId: string, from: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("categories")
    .select("name, type")
    .eq("household_id", householdId)
    .order("position");
  const lines = (data ?? []).map((c) => `• ${c.name} (${c.type === "income" ? "receita" : "despesa"})`);
  await sendWhatsAppText(from, ["🏷️ *Categorias*", ...lines].join("\n") || "Nenhuma categoria.");
}

async function sendPaymentMethods(householdId: string, from: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("payment_methods")
    .select("name, kind")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("name");
  const lines = (data ?? []).map((m) => `• ${m.name} (${m.kind})`);
  await sendWhatsAppText(from, ["💳 *Métodos de pagamento*", ...lines].join("\n") || "Nenhum método.");
}

async function undoLastTx(householdId: string, from: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: session } = await admin
    .from("whatsapp_sessions")
    .select("state")
    .eq("phone", from)
    .maybeSingle();
  const state = (session?.state ?? {}) as { last_tx_id?: string; last_tx_at?: string };
  if (!state.last_tx_id || !state.last_tx_at) {
    await sendWhatsAppText(from, "🤷 Nada para desfazer.");
    return;
  }
  const ageMin = (Date.now() - new Date(state.last_tx_at).getTime()) / 60_000;
  if (ageMin > UNDO_WINDOW_MIN) {
    await sendWhatsAppText(from, "⏰ Janela de 5 min para desfazer já passou.");
    return;
  }
  const { error } = await admin
    .from("transactions")
    .delete()
    .eq("id", state.last_tx_id)
    .eq("household_id", householdId);
  if (error) {
    await sendWhatsAppText(from, "❌ Não consegui desfazer.");
    return;
  }
  await admin
    .from("whatsapp_sessions")
    .update({ state: {} })
    .eq("phone", from);
  await sendWhatsAppText(from, "↩️ Última transação desfeita.");
}

// ---------- Helpers ----------

interface MemberRef {
  id: string;
  user_id: string;
  household_id: string;
}

async function findMember(phone: string): Promise<MemberRef | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("household_members")
    .select("id, user_id, household_id")
    .eq("whatsapp_phone", phone)
    .maybeSingle();
  return data ?? null;
}

async function resolveCategory(
  householdId: string,
  hint: string | null,
  intent: ParsedIntent["intent"],
): Promise<string | null> {
  if (!hint) return null;
  const admin = createSupabaseAdmin();
  const type = intent === "income" ? "income" : "expense";
  const { data } = await admin
    .from("categories")
    .select("id, name")
    .eq("household_id", householdId)
    .eq("type", type);
  const list = data ?? [];
  const exact = list.find((c) => c.name.toLowerCase() === hint.toLowerCase());
  if (exact) return exact.id;
  const partial = list.find(
    (c) => c.name.toLowerCase().includes(hint.toLowerCase()) || hint.toLowerCase().includes(c.name.toLowerCase()),
  );
  return partial?.id ?? null;
}

async function resolvePaymentMethod(
  householdId: string,
  hint: ParsedIntent["payment_hint"],
): Promise<string | null> {
  const admin = createSupabaseAdmin();
  if (hint) {
    const { data } = await admin
      .from("payment_methods")
      .select("id")
      .eq("household_id", householdId)
      .eq("kind", hint)
      .is("archived_at", null)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }
  const { data: def } = await admin
    .from("payment_methods")
    .select("id")
    .eq("household_id", householdId)
    .eq("is_default", true)
    .is("archived_at", null)
    .maybeSingle();
  return def?.id ?? null;
}

async function findActiveModule(
  householdId: string,
  kind: NonNullable<ParsedIntent["module_hint"]>,
): Promise<{ id: string; kind: string } | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("modules")
    .select("id, kind")
    .eq("household_id", householdId)
    .eq("kind", kind)
    .in("status", ["planning", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ---------- Rate limit ----------

async function isRateLimited(phone: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS).toISOString();
  const { data, error } = await admin
    .from("whatsapp_rate_limit")
    .select("count")
    .eq("phone", phone)
    .eq("window_start", windowStart)
    .maybeSingle();
  const current = (data?.count ?? 0) + 1;
  if (error) console.warn("rate limit select", error);
  await admin.from("whatsapp_rate_limit").upsert({ phone, window_start: windowStart, count: current });
  return current > MAX_PER_WINDOW;
}

// ---------- Pending confirmations ----------

async function stashPendingConfirmation(phone: string, member: MemberRef, parsed: ParsedIntent): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("whatsapp_sessions").upsert({
    phone,
    member_id: member.id,
    household_id: member.household_id,
    state: { pending: parsed, pending_at: new Date().toISOString() },
    last_message_at: new Date().toISOString(),
  });
}

async function consumePendingConfirmation(phone: string, confirm: boolean): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: session } = await admin
    .from("whatsapp_sessions")
    .select("member_id, household_id, state")
    .eq("phone", phone)
    .maybeSingle();
  const state = (session?.state ?? {}) as {
    pending?: ParsedIntent;
    pending_at?: string;
  };
  if (!state.pending || !session?.member_id || !session.household_id) {
    await sendWhatsAppText(phone, "Não há nada pendente para confirmar.");
    return;
  }
  await admin.from("whatsapp_sessions").update({ state: {} }).eq("phone", phone);
  if (!confirm) {
    await sendWhatsAppText(phone, "👍 Tudo bem, descartei.");
    return;
  }
  const { data: member } = await admin
    .from("household_members")
    .select("id, user_id, household_id")
    .eq("id", session.member_id)
    .single();
  if (!member) return;
  await createTransactionFromParsed(member, phone, state.pending);
}

// ---------- Large expense alert ----------

async function dispatchLargeExpenseAlert(householdId: string, amount: number): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: rules } = await admin
    .from("alerts")
    .select("id, name, config, target_member_ids")
    .eq("household_id", householdId)
    .eq("kind", "large_expense")
    .eq("active", true);

  for (const rule of rules ?? []) {
    const threshold = Number((rule.config as { threshold?: number }).threshold ?? 0);
    if (threshold > 0 && amount >= threshold) {
      const { data: targets } = await admin
        .from("household_members")
        .select("whatsapp_phone")
        .in("id", rule.target_member_ids ?? []);
      for (const t of targets ?? []) {
        if (t.whatsapp_phone) {
          await sendWhatsAppText(
            t.whatsapp_phone,
            `🚨 *Alerta — ${rule.name}*\nDespesa grande detectada: ${formatBRL(amount)}.`,
          );
        }
      }
      await admin.from("alerts").update({ last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
    }
  }
}

function normalizePhoneE164(input: string): string {
  const digits = input.replace(/\D+/g, "");
  return digits.startsWith("+") ? input : `+${digits}`;
}
