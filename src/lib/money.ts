const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatBRL(value: number | string | null | undefined): string {
  if (value == null) return BRL.format(0);
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return BRL.format(0);
  return BRL.format(n);
}

export function formatBRLCompact(value: number | string | null | undefined): string {
  if (value == null) return BRL_COMPACT.format(0);
  const n = typeof value === "string" ? Number(value) : value;
  return BRL_COMPACT.format(Number.isFinite(n) ? n : 0);
}

/**
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 50" e devolve number.
 */
export function parseBRL(input: string): number | null {
  if (!input) return null;
  const cleaned = input
    .replace(/r\$\s?/i, "")
    .replace(/\s/g, "")
    .trim();
  if (!cleaned) return null;
  const hasComma = cleaned.includes(",");
  const normalized = hasComma ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

/**
 * Calcula parcelas iguais com ajuste de centavos na última.
 */
export function splitInstallments(total: number, n: number): number[] {
  if (n <= 1) return [Math.round(total * 100) / 100];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  const out = Array<number>(n).fill(base / 100);
  out[n - 1] = (base + remainder) / 100;
  return out;
}
