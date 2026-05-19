"use server";

import { revalidatePath } from "next/cache";

import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface DeleteModuleResult {
  ok: boolean;
  error?: string;
  unlinkedTransactions?: number;
}

export async function deleteModuleAction(moduleId: string): Promise<DeleteModuleResult> {
  const ctx = await loadActiveContext();
  if (!ctx) return { ok: false, error: "Sessão expirada." };
  if (ctx.role === "viewer") return { ok: false, error: "Sem permissão." };

  const supabase = createSupabaseServer();

  // Confirma que o módulo pertence ao household ativo
  const { data: mod, error: modErr } = await supabase
    .from("modules")
    .select("id, household_id, name")
    .eq("id", moduleId)
    .single();
  if (modErr || !mod) return { ok: false, error: "Módulo não encontrado." };
  if (mod.household_id !== ctx.householdId) return { ok: false, error: "Sem permissão." };

  // Desvincula transações antes de deletar (transactions.module_id não tem FK cascade)
  const { count: txCount } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("household_id", ctx.householdId)
    .eq("module_id", moduleId);

  if ((txCount ?? 0) > 0) {
    const { error: unlinkErr } = await supabase
      .from("transactions")
      .update({ module_id: null, module_kind: null })
      .eq("household_id", ctx.householdId)
      .eq("module_id", moduleId);
    if (unlinkErr) return { ok: false, error: `Falha ao desvincular transações: ${unlinkErr.message}` };
  }

  // Cascade deleta phases, workers, gallery, items, etc.
  const { error: delErr } = await supabase.from("modules").delete().eq("id", moduleId);
  if (delErr) return { ok: false, error: `Falha ao excluir: ${delErr.message}` };

  revalidatePath("/modules");
  revalidatePath("/overview");
  return { ok: true, unlinkedTransactions: txCount ?? 0 };
}

export async function getModuleDeletionImpact(moduleId: string): Promise<{
  transactionsLinked: number;
  totalSpent: number;
  childCounts: Record<string, number>;
}> {
  const ctx = await loadActiveContext();
  if (!ctx) return { transactionsLinked: 0, totalSpent: 0, childCounts: {} };

  const supabase = createSupabaseServer();

  const { data: txs } = await supabase
    .from("transactions")
    .select("amount")
    .eq("household_id", ctx.householdId)
    .eq("module_id", moduleId);
  const transactionsLinked = txs?.length ?? 0;
  const totalSpent = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);

  const childTables = [
    "obra_phases",
    "obra_workers",
    "obra_gallery",
    "travel_items",
    "car_options",
    "gift_items",
    "education_items",
    "custom_items",
  ] as const;
  const childCounts: Record<string, number> = {};
  for (const tbl of childTables) {
    const { count } = await supabase
      .from(tbl)
      .select("id", { count: "exact", head: true })
      .eq("module_id", moduleId);
    if (count && count > 0) childCounts[tbl] = count;
  }

  return { transactionsLinked, totalSpent, childCounts };
}
