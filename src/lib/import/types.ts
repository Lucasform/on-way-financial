import { z } from "zod";

/**
 * Modelo unificado de uma transação importada (antes de virar registro definitivo).
 * Todos os parsers (CSV, XLSX, OFX, PDF) produzem este shape.
 */
export const ImportRowSchema = z.object({
  /** id efêmero apenas pra UI (linha do CSV / sequência) */
  tmp_id: z.string(),
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data ISO YYYY-MM-DD"),
  /** Inferido pela IA (nome humano) — depois resolvemos pra id */
  category_hint: z.string().nullable().optional(),
  /** Inferido pela IA (kind) — depois resolvemos pra id */
  payment_hint: z
    .enum(["cash", "pix", "debit_card", "credit_card", "bank_transfer", "boleto", "meal_voucher", "other"])
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  /** Estado escolhido pelo usuário no wizard */
  selected: z.boolean().default(true),
  /** Marcado se já existe no banco (duplicada) */
  is_duplicate: z.boolean().default(false),
});

export type ImportRow = z.infer<typeof ImportRowSchema>;

export interface ImportSummary {
  total: number;
  selected: number;
  duplicates: number;
  income_total: number;
  expense_total: number;
}

export function summarize(rows: ImportRow[]): ImportSummary {
  let income = 0;
  let expense = 0;
  let duplicates = 0;
  let selected = 0;
  for (const r of rows) {
    if (r.is_duplicate) duplicates++;
    if (r.selected) selected++;
    if (r.type === "income") income += r.amount;
    if (r.type === "expense") expense += r.amount;
  }
  return { total: rows.length, selected, duplicates, income_total: income, expense_total: expense };
}
