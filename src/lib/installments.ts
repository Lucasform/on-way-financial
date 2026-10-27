export type Frequency = "semanal" | "quinzenal" | "mensal";

export type RemainderSchedule =
  | { type: "single"; due_date: string }
  | { type: "recurring"; frequency: Frequency; first_date: string; count: number };

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

function addMonthsClamped(iso: string, months: number): string {
  const [y, m, day] = iso.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Divide o restante em parcelas exatas em centavos; a última absorve o arredondamento. */
export function planRemainder(remaining: number, schedule: RemainderSchedule): PlannedPayment[] {
  const cents = toCents(remaining);
  if (schedule.type === "single") {
    return [{ label: "restante", amount: cents / 100, due_date: schedule.due_date }];
  }
  const n = schedule.count;
  const base = Math.floor(cents / n);
  return Array.from({ length: n }, (_, i) => {
    const amount = i === n - 1 ? cents - base * (n - 1) : base;
    const due =
      schedule.frequency === "mensal"
        ? addMonthsClamped(schedule.first_date, i)
        : addDaysISO(schedule.first_date, i * (schedule.frequency === "semanal" ? 7 : 14));
    return { label: `parcela ${i + 1}/${n}`, amount: amount / 100, due_date: due };
  });
}
