import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  format,
  formatDistanceToNowStrict,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const APP_TZ = "America/Sao_Paulo";

export function nowSP(): Date {
  return toZonedTime(new Date(), APP_TZ);
}

export function todayISO(): string {
  return formatInTimeZone(new Date(), APP_TZ, "yyyy-MM-dd");
}

export function isoToDate(iso: string): Date {
  return parseISO(iso);
}

export function fmtDate(date: Date | string, pattern = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: ptBR });
}

export function fmtDateLong(date: Date | string): string {
  return fmtDate(date, "PPP");
}

export function fmtRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const diff = differenceInDays(new Date(), d);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff === -1) return "amanhã";
  if (Math.abs(diff) < 7) return formatDistanceToNowStrict(d, { addSuffix: true, locale: ptBR });
  return fmtDate(d);
}

export function monthRange(reference: Date | string = new Date()) {
  const d = typeof reference === "string" ? parseISO(reference) : reference;
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export function monthRangeISO(reference: Date | string = new Date()): { start: string; end: string } {
  const { start, end } = monthRange(reference);
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
}

export function previousMonthRange(reference: Date | string = new Date()) {
  const d = typeof reference === "string" ? parseISO(reference) : reference;
  return monthRange(addMonths(d, -1));
}

/**
 * Resolve datas relativas em português ("hoje", "ontem", "anteontem", "sexta passada")
 * Retorna ISO yyyy-MM-dd ou null.
 */
export function parseRelativeDatePt(input: string | null | undefined, now = new Date()): string | null {
  if (!input) return null;
  const txt = input.trim().toLowerCase();
  if (!txt) return null;
  if (["hoje", "agora"].includes(txt)) return format(now, "yyyy-MM-dd");
  if (txt === "ontem") return format(subDays(now, 1), "yyyy-MM-dd");
  if (["anteontem", "ante-ontem"].includes(txt)) return format(subDays(now, 2), "yyyy-MM-dd");
  if (txt === "amanhã" || txt === "amanha") return format(addDays(now, 1), "yyyy-MM-dd");
  const daysAgoMatch = txt.match(/^h[áa]\s+(\d+)\s+dias?$/);
  if (daysAgoMatch?.[1]) return format(subDays(now, Number(daysAgoMatch[1])), "yyyy-MM-dd");
  const iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return txt;
  const br = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export { addDays, addMonths, format, isAfter, isBefore, parseISO, startOfMonth, endOfMonth };
