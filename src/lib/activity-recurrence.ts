export const ACTIVITY_RECURRENCES = [
  "diaria",
  "semanal",
  "quinzenal",
  "mensal",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
] as const;

export type ActivityRecurrence = (typeof ACTIVITY_RECURRENCES)[number];

export const RECURRENCE_LABELS: Record<ActivityRecurrence, string> = {
  diaria: "Todo dia",
  semanal: "Toda semana",
  quinzenal: "A cada 15 dias",
  mensal: "Todo mês",
  bimestral: "A cada 2 meses",
  trimestral: "A cada 3 meses",
  semestral: "A cada 6 meses",
  anual: "Todo ano",
};

export function asRecurrence(v: unknown): ActivityRecurrence | null {
  return ACTIVITY_RECURRENCES.find((r) => r === v) ?? null;
}
