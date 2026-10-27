import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { todayISO } from "@/lib/dates";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export type ExpenseStatus = "cotacao" | "executada";
export type SupplierInput = { id: string } | { newName: string };

export function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function findOrCreateSupplier(
  db: Db,
  householdId: string,
  input: SupplierInput,
): Promise<{ id: string; name: string } | null> {
  if ("id" in input) {
    const { data } = await db
      .from("suppliers")
      .select("id, name")
      .eq("id", input.id)
      .eq("household_id", householdId)
      .maybeSingle();
    return data;
  }
  const { data: existing } = await db.from("suppliers").select("id, name").eq("household_id", householdId);
  const wanted = normalizeName(input.newName);
  const match = (existing ?? []).find((s) => normalizeName(s.name) === wanted);
  if (match) return match;
  const { data: created } = await db
    .from("suppliers")
    .insert({ household_id: householdId, name: input.newName.trim(), category: "material" })
    .select("id, name")
    .single();
  return created;
}

/**
 * Fluxo único de "Adicionar despesa": sempre cria a cotação no fornecedor; se executada,
 * a cotação já nasce aceita e vira um custo feito.
 */
export async function createExpense(
  db: Db,
  args: {
    householdId: string;
    moduleId: string;
    name: string;
    amount: number;
    supplier: SupplierInput;
    status: ExpenseStatus;
    date?: string | null;
    notes?: string | null;
  },
) {
  const supplier = await findOrCreateSupplier(db, args.householdId, args.supplier);
  if (!supplier) return { ok: false as const, error: "supplier_not_found" };

  const executed = args.status === "executada";
  const date = args.date || todayISO();

  const { data: quote, error: quoteErr } = await db
    .from("price_quotes")
    .insert({
      household_id: args.householdId,
      supplier_id: supplier.id,
      item_name: args.name,
      unit: "un",
      unit_price: args.amount,
      quoted_at: date,
      accepted_at: executed ? new Date().toISOString() : null,
      notes: args.notes ?? null,
    })
    .select("id, item_name, unit, unit_price, quoted_at, accepted_at")
    .single();
  if (quoteErr || !quote) return { ok: false as const, error: quoteErr?.message ?? "quote_failed" };

  if (!executed) return { ok: true as const, supplier, quote, item: null };

  const { data: item, error: itemErr } = await db
    .from("obra_items")
    .insert({
      module_id: args.moduleId,
      category: "material",
      name: args.name,
      supplier: supplier.name,
      supplier_id: supplier.id,
      unit: "un",
      quantity: 1,
      unit_price: args.amount,
      actual_unit_price: args.amount,
      status: "done",
      bought_at: date,
      quote_id: quote.id,
      notes: args.notes ?? null,
    })
    .select("id, name, quantity, unit, unit_price, actual_unit_price, status, bought_at")
    .single();
  if (itemErr || !item) {
    await db.from("price_quotes").delete().eq("id", quote.id);
    return { ok: false as const, error: itemErr?.message ?? "item_failed" };
  }
  return { ok: true as const, supplier, quote, item };
}
