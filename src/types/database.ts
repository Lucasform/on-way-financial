// Tipos do schema Supabase. Placeholder até gerar via `supabase gen types typescript`.
// Fase 1 do ROADMAP substitui este arquivo pelo tipo real gerado.

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionSource =
  | "manual"
  | "ai"
  | "telegram"
  | "whatsapp"
  | "import"
  | "recurring";

export type Transaction = {
  id: string;
  household_id: string;
  account_id: string | null;
  category_id: string | null;
  project_id: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  occurred_on: string;
  status: "pending" | "cleared" | "reconciled";
  source: TransactionSource;
  ai_confidence: number | null;
  created_at: string;
};
