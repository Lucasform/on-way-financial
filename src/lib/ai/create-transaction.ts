import "server-only";

import { todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

import type { ParsedIntent } from "@/lib/ai/parser";

/**
 * Registra um custo já pago (status "done") direto na obra, a partir de um texto livre
 * tipo "gastei 50 no mercado". Fluxo rápido, sem pedir confirmação.
 */
export async function createCostFromIntent(args: {
  householdId: string;
  intent: ParsedIntent;
}): Promise<{ ok: true; reply: string } | { ok: false; reply: string }> {
  const { householdId, intent } = args;
  if (intent.amount == null) return { ok: false, reply: "Não consegui identificar o valor." };
  if (intent.intent === "income") {
    return { ok: false, reply: "Esse app agora só registra custos da obra, não entra receita." };
  }

  const admin = createSupabaseAdmin();
  const occurredAt = intent.occurred_at ?? todayISO();

  const { data: mod } = await admin
    .from("modules")
    .select("id")
    .eq("household_id", householdId)
    .eq("kind", "obra")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!mod) return { ok: false, reply: "Não encontrei a obra ativa." };

  const { error } = await admin.from("obra_items").insert({
    module_id: mod.id,
    category: "material",
    name: intent.description?.trim() || "Custo",
    unit: "un",
    quantity: 1,
    unit_price: intent.amount,
    actual_unit_price: intent.amount,
    status: "done",
    bought_at: occurredAt,
    notes: "[origem:ai_chat]",
  });

  if (error) {
    console.error("createCostFromIntent insert error", error);
    return { ok: false, reply: "Não consegui registrar agora. Tenta de novo em instantes." };
  }

  const parts = [
    `✅ Custo de ${formatBRL(intent.amount)} registrado`,
    intent.description ? ` — ${intent.description}` : "",
    `\nData: ${occurredAt}`,
    "\n\nSe foi de um fornecedor cadastrado, você pode mover ele lá depois pra organizar certinho.",
  ];
  return { ok: true, reply: parts.join("") };
}
