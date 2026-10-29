export type Frequency = "semanal" | "quinzenal" | "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  semanal: "Toda semana",
  quinzenal: "A cada 15 dias",
  mensal: "Todo mês",
  bimestral: "A cada 2 meses",
  trimestral: "A cada 3 meses",
  semestral: "A cada 6 meses",
  anual: "Todo ano",
};

const MONTHS: Partial<Record<Frequency, number>> = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
const DAYS: Partial<Record<Frequency, number>> = { semanal: 7, quinzenal: 14 };

export interface PlannedPayment {
  label: string;
  amount: number;
  due_date: string;
}

export const toCents = (v: number) => Math.round(v * 100);

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonthsClamped(iso: string, months: number): string {
  const [y, m, day] = iso.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function nthDate(first: string, frequency: Frequency, i: number): string {
  const months = MONTHS[frequency];
  return months ? addMonthsClamped(first, i * months) : addDaysISO(first, i * (DAYS[frequency] ?? 30));
}

/**
 * Um bloco do plano de pagamento: um pagamento só (entrada, final, restante) ou uma série
 * recorrente (parcelas fixas, semestrais...). `auto` faz o bloco absorver o que faltar pra fechar o total.
 */
export type PlanBlock =
  | { id: string; kind: "single"; label: string; date: string; amount: number | null; auto: boolean }
  | {
      id: string;
      kind: "recurring";
      label: string;
      frequency: Frequency;
      first_date: string;
      count: number;
      amount: number | null;
      auto: boolean;
    };

export interface PlanSlot {
  key: string;
  label: string;
  due_date: string;
  cents: number;
  auto: boolean;
  overridden: boolean;
}

export interface PlanResult {
  slots: PlanSlot[];
  totalCents: number;
  /** restante menos o que foi distribuído: > 0 falta distribuir, < 0 passou do total */
  diffCents: number;
  valid: boolean;
}

/** Monta as parcelas do plano. Valores em centavos exatos; as parcelas automáticas dividem a sobra e a última absorve o arredondamento. */
export function buildPlan(remainingCents: number, blocks: PlanBlock[], overrides: Record<string, number> = {}): PlanResult {
  type Draft = Omit<PlanSlot, "cents"> & { cents: number | null };
  const drafts: Draft[] = [];
  for (const b of blocks) {
    if (b.kind === "single") {
      const key = `${b.id}:0`;
      const o = overrides[key];
      drafts.push({
        key,
        label: b.label,
        due_date: b.date,
        cents: o !== undefined ? o : b.auto ? null : toCents(b.amount ?? 0),
        auto: b.auto && o === undefined,
        overridden: o !== undefined,
      });
    } else {
      const n = Math.max(0, Math.min(240, Math.floor(b.count)));
      for (let i = 0; i < n; i++) {
        const key = `${b.id}:${i}`;
        const o = overrides[key];
        drafts.push({
          key,
          label: `${b.label} ${i + 1}/${n}`,
          due_date: b.first_date ? nthDate(b.first_date, b.frequency, i) : "",
          cents: o !== undefined ? o : b.auto ? null : toCents(b.amount ?? 0),
          auto: b.auto && o === undefined,
          overridden: o !== undefined,
        });
      }
    }
  }

  const fixed = drafts.reduce((s, d) => s + (d.cents ?? 0), 0);
  const autos = drafts.filter((d) => d.cents === null);
  if (autos.length > 0) {
    const left = remainingCents - fixed;
    const base = Math.floor(left / autos.length);
    autos.forEach((d, i) => {
      d.cents = i === autos.length - 1 ? left - base * (autos.length - 1) : base;
    });
  }

  const slots = (drafts as PlanSlot[]).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const totalCents = slots.reduce((s, d) => s + d.cents, 0);
  const diffCents = remainingCents - totalCents;
  const valid = slots.length > 0 && diffCents === 0 && slots.every((s) => s.cents > 0 && /^\d{4}-\d{2}-\d{2}$/.test(s.due_date));
  return { slots, totalCents, diffCents, valid };
}
