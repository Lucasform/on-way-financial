import "server-only";

import { todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

import type { ParsedIntent } from "@/lib/ai/parser";

export type TxOrigin = "ai_chat" | "telegram" | "whatsapp";

export async function createTransactionFromIntent(args: {
  householdId: string;
  userId: string;
  intent: ParsedIntent;
  moduleOverride?: { id: string; kind: string } | null;
  origin?: TxOrigin;
}): Promise<{ ok: true; reply: string } | { ok: false; reply: string }> {
  const { householdId, userId, intent } = args;
  if (intent.amount == null) return { ok: false, reply: "Não consegui identificar o valor." };

  const admin = createSupabaseAdmin();
  const occurredAt = intent.occurred_at ?? todayISO();

  const categoryId = await resolveCategory(householdId, intent.category_hint, intent.intent);
  const paymentMethodId = await resolvePaymentMethod(householdId, intent.payment_hint);
  const moduleRef =
    args.moduleOverride !== undefined
      ? args.moduleOverride
      : intent.module_hint
        ? await findActiveModule(householdId, intent.module_hint)
        : null;

  // O DB tem CHECK constraint em source (so aceita web/whatsapp/import).
  // Marcamos a origem real como prefixo no notes; UI parseia pra mostrar o badge correto.
  const originTag = args.origin ? `[origem:${args.origin}]` : null;
  const notes = originTag;

  const { error } = await admin.from("transactions").insert({
    household_id: householdId,
    type: intent.intent === "income" ? "income" : "expense",
    amount: intent.amount,
    description: intent.description,
    occurred_at: occurredAt,
    category_id: categoryId,
    payment_method_id: paymentMethodId,
    module_kind: (moduleRef?.kind as "obra" | "travel" | "car" | "gift" | "education" | "custom" | undefined) ?? null,
    module_id: moduleRef?.id ?? null,
    notes,
    source: "whatsapp",
    created_by: userId,
  });

  if (error) {
    console.error("createTransactionFromIntent insert error", error);
    return { ok: false, reply: "Não consegui registrar agora. Tenta de novo em instantes." };
  }

  const [{ data: cat }, { data: pay }] = await Promise.all([
    categoryId
      ? admin.from("categories").select("name").eq("id", categoryId).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    paymentMethodId
      ? admin.from("payment_methods").select("name").eq("id", paymentMethodId).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  const verb = intent.intent === "income" ? "Receita" : "Despesa";
  const parts = [
    `✅ ${verb} de ${formatBRL(intent.amount)} registrada`,
    intent.description ? ` — ${intent.description}` : "",
    cat?.name ? `\nCategoria: ${cat.name}` : "",
    pay?.name ? `\nMétodo: ${pay.name}` : "",
    `\nData: ${occurredAt}`,
  ];
  return { ok: true, reply: parts.join("") };
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
  const h = hint.toLowerCase();
  const exact = list.find((c) => c.name.toLowerCase() === h);
  if (exact) return exact.id;
  const partial = list.find(
    (c) => c.name.toLowerCase().includes(h) || h.includes(c.name.toLowerCase()),
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
