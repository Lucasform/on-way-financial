import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ImportRow } from "@/lib/import/types";

/**
 * Marca como duplicada toda linha que tiver uma transação no banco com
 * mesma data + valor + descrição similar (similaridade básica de prefixo/contains).
 */
export async function markDuplicates(householdId: string, rows: ImportRow[]): Promise<ImportRow[]> {
  if (rows.length === 0) return rows;
  const admin = createSupabaseAdmin();
  const dates = [...new Set(rows.map((r) => r.occurred_at))];
  const { data } = await admin
    .from("transactions")
    .select("amount, description, occurred_at, type")
    .eq("household_id", householdId)
    .in("occurred_at", dates);

  const existing = data ?? [];
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return rows.map((r) => {
    const normDesc = norm(r.description);
    const match = existing.find(
      (e) =>
        e.occurred_at === r.occurred_at &&
        Math.abs(Number(e.amount) - r.amount) < 0.01 &&
        e.type === r.type &&
        (norm(e.description ?? "") === normDesc ||
          norm(e.description ?? "").includes(normDesc.slice(0, 12)) ||
          normDesc.includes(norm(e.description ?? "").slice(0, 12))),
    );
    return { ...r, is_duplicate: !!match, selected: r.selected && !match };
  });
}
