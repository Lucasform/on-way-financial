import "server-only";

import { todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

import type { ParsedIntent } from "@/lib/ai/parser";

interface SupplierRef {
  id: string;
  name: string;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchSuppliers(text: string, suppliers: SupplierRef[]): SupplierRef[] {
  const haystack = ` ${normalize(text)} `;
  const full = suppliers
    .filter((s) => {
      const n = normalize(s.name);
      return n.length > 0 && haystack.includes(` ${n} `);
    })
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length);
  const best = full[0];
  if (best) return [best];
  return suppliers.filter((s) => {
    const first = normalize(s.name).split(" ")[0] ?? "";
    return first.length >= 4 && haystack.includes(` ${first} `);
  });
}

function supplierListHint(suppliers: SupplierRef[]): string {
  if (suppliers.length === 0) return "Você ainda não tem fornecedor cadastrado. Cadastre em Fornecedores e me manda de novo.";
  const names = suppliers.slice(0, 10).map((s) => s.name).join(", ");
  return `Me manda de novo citando o fornecedor. Os cadastrados são: ${names}. Se for um novo, cadastre em Fornecedores antes.`;
}

/**
 * Registra um custo já pago (status "done") num fornecedor cadastrado, a partir de texto livre
 * como "gastei 150 em cimento na Leroy". Sem fornecedor identificado, não grava.
 */
export async function createCostFromIntent(args: {
  householdId: string;
  intent: ParsedIntent;
  texts: string[];
}): Promise<{ ok: true; reply: string } | { ok: false; reply: string }> {
  const { householdId, intent } = args;
  if (intent.amount == null) return { ok: false, reply: "Não consegui identificar o valor." };
  if (intent.intent === "income") {
    return { ok: false, reply: "Esse app só registra custos da obra, não entra receita." };
  }

  const admin = createSupabaseAdmin();
  const occurredAt = intent.occurred_at ?? todayISO();

  const [{ data: mod }, { data: suppliers }] = await Promise.all([
    admin
      .from("modules")
      .select("id")
      .eq("household_id", householdId)
      .eq("kind", "obra")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin.from("suppliers").select("id, name").eq("household_id", householdId).order("name"),
  ]);
  if (!mod) return { ok: false, reply: "Não encontrei a obra ativa." };

  let supplier: SupplierRef | null = null;
  for (const text of [...args.texts, intent.description ?? ""]) {
    if (!text.trim()) continue;
    const found = matchSuppliers(text, suppliers ?? []);
    if (found.length === 1 && found[0]) {
      supplier = found[0];
      break;
    }
    if (found.length > 1) {
      return {
        ok: false,
        reply: `Achei mais de um fornecedor possível (${found.map((s) => s.name).join(", ")}). Me manda de novo com o nome completo do certo.`,
      };
    }
  }
  if (!supplier) {
    return { ok: false, reply: `Pra registrar ${formatBRL(intent.amount)} eu preciso saber de qual fornecedor foi. ${supplierListHint(suppliers ?? [])}` };
  }

  const { error } = await admin.from("obra_items").insert({
    module_id: mod.id,
    category: "material",
    name: intent.description?.trim() || "Custo",
    supplier: supplier.name,
    supplier_id: supplier.id,
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

  const what = intent.description ? ` (${intent.description})` : "";
  return {
    ok: true,
    reply: `✅ Custo de ${formatBRL(intent.amount)}${what} registrado em ${supplier.name}.\nData: ${occurredAt}\n\nSe ficou errado, dá pra apagar em Gasto.`,
  };
}
