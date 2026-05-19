import type { ImportRow } from "@/lib/import/types";

/**
 * Parser de CSV minimal: detecta delimitador (vírgula/ponto-vírgula),
 * cabeçalho e mapeia colunas comuns (date, description, amount).
 * Heurística simples — pra arquivos mais bagunçados a IA cuida.
 */

const DATE_KEYS = ["data", "date", "dt", "data lançamento", "data lancamento", "data movimento"];
const DESC_KEYS = ["descrição", "descricao", "description", "histórico", "historico", "memo", "detalhe"];
const AMOUNT_KEYS = ["valor", "amount", "value", "montante"];
const DEBIT_KEYS = ["débito", "debito", "saida", "saída", "withdrawal"];
const CREDIT_KEYS = ["crédito", "credito", "entrada", "deposit"];

function detectDelimiter(line: string): string {
  const candidates = [";", ",", "\t", "|"];
  let best = ",";
  let max = 0;
  for (const d of candidates) {
    const c = line.split(d).length;
    if (c > max) {
      max = c;
      best = d;
    }
  }
  return best;
}

function splitCsv(line: string, delim: string): string[] {
  // simples: respeita aspas duplas
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === delim && !inQ) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  // dd/mm/yyyy ou dd-mm-yyyy
  const br = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (br) {
    const [, d, m, rawY] = br;
    const y = rawY!.length === 2 ? (Number(rawY) > 50 ? "19" : "20") + rawY : rawY!;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  let v = value.replace(/[^\d,.\-]/g, "").trim();
  if (!v || v === "-") return null;
  const hasComma = v.includes(",");
  if (hasComma) {
    // formato pt-BR: 1.234,56
    v = v.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const delim = detectDelimiter(lines[0]!);
  const header = splitCsv(lines[0]!, delim).map((h) => h.toLowerCase());

  const findIdx = (keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));

  const idxDate = findIdx(DATE_KEYS);
  const idxDesc = findIdx(DESC_KEYS);
  const idxAmount = findIdx(AMOUNT_KEYS);
  const idxDebit = findIdx(DEBIT_KEYS);
  const idxCredit = findIdx(CREDIT_KEYS);

  if (idxDate === -1 || idxDesc === -1) return [];

  const out: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsv(lines[i]!, delim);
    const date = parseDate(cells[idxDate] ?? "");
    const desc = (cells[idxDesc] ?? "").trim();
    if (!date || !desc) continue;

    let type: ImportRow["type"] = "expense";
    let amount: number | null = null;

    if (idxAmount !== -1) {
      amount = parseAmount(cells[idxAmount] ?? "");
      if (amount !== null && amount < 0) {
        type = "expense";
        amount = Math.abs(amount);
      } else if (amount !== null && amount > 0) {
        type = "income";
      }
    } else {
      const debit = idxDebit !== -1 ? parseAmount(cells[idxDebit] ?? "") : null;
      const credit = idxCredit !== -1 ? parseAmount(cells[idxCredit] ?? "") : null;
      if (debit && debit > 0) {
        amount = debit;
        type = "expense";
      } else if (credit && credit > 0) {
        amount = credit;
        type = "income";
      }
    }

    if (amount === null || amount <= 0) continue;

    out.push({
      tmp_id: `csv-${i}`,
      type,
      amount,
      description: desc.slice(0, 200),
      occurred_at: date,
      category_hint: null,
      payment_hint: null,
      notes: null,
      selected: true,
      is_duplicate: false,
    });
  }
  return out;
}
