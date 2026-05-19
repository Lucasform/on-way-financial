import "server-only";

import { parseCommand, parseFreeText, type ParsedIntent } from "@/lib/ai/parser";
import { monthRangeISO, todayISO } from "@/lib/dates";
import { getPublicEnv } from "@/lib/env";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramText } from "@/lib/telegram/client";
import {
  tgBalance,
  tgConfirmTransaction,
  tgHelpMessage,
  tgLinkInvalid,
  tgLinkedSuccess,
  tgLowConfidence,
  tgWelcomeNotLinked,
} from "@/lib/telegram/templates";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const UNDO_WINDOW_MIN = 5;

interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
}

export async function handleTelegramUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message ?? update.edited_message;
  if (!msg?.text) return;
  try {
    await processMessage(msg);
  } catch (err) {
    console.error("Telegram processMessage error", err);
  }
}

async function processMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text!.trim();
  const env = getPublicEnv();

  if (await isRateLimited(chatId)) {
    await sendTelegramText(chatId, "⏳ Muitas mensagens em pouco tempo. Aguarde alguns segundos.");
    return;
  }

  // /start <token>  → vínculo de conta
  const startMatch = text.match(/^\/start(?:@\S+)?(?:\s+(\S+))?$/i);
  if (startMatch) {
    const linkToken = startMatch[1];
    if (linkToken) {
      await handleLinkToken(chatId, msg.from, linkToken);
      return;
    }
    await sendTelegramText(chatId, tgWelcomeNotLinked(env.NEXT_PUBLIC_APP_URL));
    return;
  }

  // Encontra o membro pelo chat_id
  const member = await findMemberByChat(chatId);
  if (!member) {
    await sendTelegramText(chatId, tgWelcomeNotLinked(env.NEXT_PUBLIC_APP_URL));
    return;
  }

  // Confirmações pendentes (SIM/NÃO)
  if (/^(sim|s|confirmo|ok|yes|y)$/i.test(text)) {
    await consumePending(chatId, true);
    return;
  }
  if (/^(n[ãa]o|n|cancelar|no)$/i.test(text)) {
    await consumePending(chatId, false);
    return;
  }

  // Comandos /...
  const command = parseCommand(text);
  if (command && "command" in command) {
    await runSlashCommand(member, chatId, command.command);
    return;
  }
  if (command && "intent" in command) {
    await handleParsedIntent(member, chatId, command);
    return;
  }

  // Texto livre → IA
  const parsed = await parseFreeText(text);
  await handleParsedIntent(member, chatId, parsed);
}

interface MemberRef {
  id: string;
  user_id: string;
  household_id: string;
}

async function handleParsedIntent(member: MemberRef, chatId: number, parsed: ParsedIntent): Promise<void> {
  if (parsed.intent === "query_balance") {
    await sendBalance(member.household_id, chatId);
    return;
  }
  if (parsed.intent === "unknown" || parsed.amount == null) {
    await sendTelegramText(chatId, "🤖 Não consegui entender. Tenta `/ajuda` para ver os comandos.");
    return;
  }

  if (parsed.confidence < 0.7) {
    await stashPending(chatId, member, parsed);
    await sendTelegramText(
      chatId,
      tgLowConfidence({
        amount: parsed.amount,
        categoryHint: parsed.category_hint,
        paymentHint: parsed.payment_hint,
      }),
    );
    return;
  }

  await createTransactionFromParsed(member, chatId, parsed);
}

async function createTransactionFromParsed(
  member: MemberRef,
  chatId: number,
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
      module_kind: (moduleRef?.kind as "obra" | "travel" | "car" | "gift" | "education" | "custom" | undefined) ?? null,
      module_id: moduleRef?.id ?? null,
      source: "whatsapp", // unificamos com canal externo; usar "telegram" exigiria alterar enum/check
      created_by: member.user_id,
    })
    .select("id")
    .single();

  if (error || !tx) {
    console.error("Insert TG tx error", error);
    await sendTelegramText(chatId, "❌ Não consegui registrar agora. Tenta de novo em instantes.");
    return;
  }

  await admin.from("telegram_sessions").upsert({
    chat_id: chatId,
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

  await sendTelegramText(
    chatId,
    tgConfirmTransaction({
      type: parsed.intent === "income" ? "income" : "expense",
      amount: parsed.amount,
      description: parsed.description,
      categoryName: cat?.name ?? null,
      paymentName: pay?.name ?? null,
      occurredAt,
    }),
  );

  if (parsed.intent === "expense") {
    await dispatchLargeExpenseAlert(member.household_id, parsed.amount).catch((e) =>
      console.error("largeExpenseAlert TG", e),
    );
  }
}

async function runSlashCommand(member: MemberRef, chatId: number, command: string): Promise<void> {
  switch (command) {
    case "ajuda":
    case "help":
      await sendTelegramText(chatId, tgHelpMessage());
      return;
    case "saldo":
      await sendBalance(member.household_id, chatId);
      return;
    case "categorias":
      await sendCategories(member.household_id, chatId);
      return;
    case "metodos":
    case "métodos":
      await sendPaymentMethods(member.household_id, chatId);
      return;
    case "cancelar":
      await undoLastTx(member.household_id, chatId);
      return;
    default:
      await sendTelegramText(chatId, `🤖 Comando \`/${command}\` não reconhecido. Tenta \`/ajuda\`.`);
  }
}

async function sendBalance(householdId: string, chatId: number): Promise<void> {
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
      const name = (tx as unknown as { categories: { name: string } | null }).categories?.name ?? "Outros";
      byCategory.set(name, (byCategory.get(name) ?? 0) + amt);
    }
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  await sendTelegramText(
    chatId,
    tgBalance({
      income,
      expense,
      topCategory: top ? { name: top[0], total: top[1] } : null,
    }),
  );
}

async function sendCategories(householdId: string, chatId: number): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("categories")
    .select("name, type")
    .eq("household_id", householdId)
    .order("position");
  const lines = (data ?? []).map((c) => `• ${c.name} (${c.type === "income" ? "receita" : "despesa"})`);
  await sendTelegramText(chatId, ["🏷️ *Categorias*", ...lines].join("\n") || "Nenhuma categoria.");
}

async function sendPaymentMethods(householdId: string, chatId: number): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("payment_methods")
    .select("name, kind")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("name");
  const lines = (data ?? []).map((m) => `• ${m.name} (${m.kind})`);
  await sendTelegramText(chatId, ["💳 *Métodos de pagamento*", ...lines].join("\n") || "Nenhum método.");
}

async function undoLastTx(householdId: string, chatId: number): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: session } = await admin
    .from("telegram_sessions")
    .select("state")
    .eq("chat_id", chatId)
    .maybeSingle();
  const state = (session?.state ?? {}) as { last_tx_id?: string; last_tx_at?: string };
  if (!state.last_tx_id || !state.last_tx_at) {
    await sendTelegramText(chatId, "🤷 Nada para desfazer.");
    return;
  }
  const ageMin = (Date.now() - new Date(state.last_tx_at).getTime()) / 60_000;
  if (ageMin > UNDO_WINDOW_MIN) {
    await sendTelegramText(chatId, "⏰ Janela de 5 min para desfazer já passou.");
    return;
  }
  const { error } = await admin.from("transactions").delete().eq("id", state.last_tx_id).eq("household_id", householdId);
  if (error) {
    await sendTelegramText(chatId, "❌ Não consegui desfazer.");
    return;
  }
  await admin.from("telegram_sessions").update({ state: {} }).eq("chat_id", chatId);
  await sendTelegramText(chatId, "↩️ Última transação desfeita.");
}

// ---------- Linking via /start <token> ----------

async function handleLinkToken(chatId: number, from: TgUser | undefined, token: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: link } = await admin
    .from("telegram_link_tokens")
    .select("token, member_id, household_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!link || link.consumed_at || new Date(link.expires_at) < new Date()) {
    await sendTelegramText(chatId, tgLinkInvalid());
    return;
  }

  const username = from?.username ?? null;

  // Conflict: outro chat já está vinculado a esse member? Atualizamos com o novo.
  const { error: updErr } = await admin
    .from("household_members")
    .update({ telegram_chat_id: chatId, telegram_username: username })
    .eq("id", link.member_id);
  if (updErr) {
    console.error("link update member", updErr);
    await sendTelegramText(chatId, "❌ Não consegui vincular. Tente novamente.");
    return;
  }

  await admin.from("telegram_link_tokens").update({ consumed_at: new Date().toISOString() }).eq("token", token);

  await admin.from("telegram_sessions").upsert({
    chat_id: chatId,
    member_id: link.member_id,
    household_id: link.household_id,
    state: {},
    last_message_at: new Date().toISOString(),
  });

  const { data: member } = await admin
    .from("household_members")
    .select("display_name")
    .eq("id", link.member_id)
    .single();

  await sendTelegramText(chatId, tgLinkedSuccess(member?.display_name ?? from?.first_name ?? null));
}

// ---------- Helpers ----------

async function findMemberByChat(chatId: number): Promise<MemberRef | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("household_members")
    .select("id, user_id, household_id")
    .eq("telegram_chat_id", chatId)
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
    (c) =>
      c.name.toLowerCase().includes(hint.toLowerCase()) || hint.toLowerCase().includes(c.name.toLowerCase()),
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

async function isRateLimited(chatId: number): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS).toISOString();
  const { data } = await admin
    .from("telegram_rate_limit")
    .select("count")
    .eq("chat_id", chatId)
    .eq("window_start", windowStart)
    .maybeSingle();
  const current = (data?.count ?? 0) + 1;
  await admin.from("telegram_rate_limit").upsert({ chat_id: chatId, window_start: windowStart, count: current });
  return current > MAX_PER_WINDOW;
}

async function stashPending(chatId: number, member: MemberRef, parsed: ParsedIntent): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("telegram_sessions").upsert({
    chat_id: chatId,
    member_id: member.id,
    household_id: member.household_id,
    state: { pending: parsed, pending_at: new Date().toISOString() },
    last_message_at: new Date().toISOString(),
  });
}

async function consumePending(chatId: number, confirm: boolean): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: session } = await admin
    .from("telegram_sessions")
    .select("member_id, household_id, state")
    .eq("chat_id", chatId)
    .maybeSingle();
  const state = (session?.state ?? {}) as { pending?: ParsedIntent };
  if (!state.pending || !session?.member_id || !session.household_id) {
    await sendTelegramText(chatId, "Não há nada pendente para confirmar.");
    return;
  }
  await admin.from("telegram_sessions").update({ state: {} }).eq("chat_id", chatId);
  if (!confirm) {
    await sendTelegramText(chatId, "👍 Tudo bem, descartei.");
    return;
  }
  const { data: member } = await admin
    .from("household_members")
    .select("id, user_id, household_id")
    .eq("id", session.member_id)
    .single();
  if (!member) return;
  await createTransactionFromParsed(member, chatId, state.pending);
}

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
        .select("telegram_chat_id")
        .in("id", rule.target_member_ids ?? []);
      for (const t of targets ?? []) {
        if (t.telegram_chat_id) {
          await sendTelegramText(
            t.telegram_chat_id,
            `🚨 *Alerta — ${rule.name}*\nDespesa grande detectada: ${formatBRL(amount)}.`,
          );
        }
      }
      await admin.from("alerts").update({ last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
    }
  }
}
