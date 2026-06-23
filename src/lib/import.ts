export type ParsedTx = {
  date: string; // YYYY-MM-DD
  amount: number; // valor com sinal (negativo = saída)
  description: string;
  external_id: string | null;
};

function ofxDate(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length < 8) return new Date().toISOString().slice(0, 10);
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}>([^<\\r\\n]*)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

export function parseOFX(content: string): ParsedTx[] {
  const out: ParsedTx[] = [];
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  for (const b of blocks) {
    const amt = parseFloat((tag(b, "TRNAMT") || "0").replace(",", "."));
    if (!amt) continue;
    out.push({
      date: ofxDate(tag(b, "DTPOSTED") || ""),
      amount: amt,
      description: tag(b, "NAME") || tag(b, "MEMO") || "Importado",
      external_id: tag(b, "FITID"),
    });
  }
  return out;
}

function normalizeAmount(raw: string): number | null {
  let s = raw.trim().replace(/["R$\s]/g, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) neg = true;
  s = s.replace(/[+-]/g, "");
  // formato BR: 1.234,56 -> 1234.56 ; formato US: 1,234.56 -> 1234.56
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

function parseDateCell(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2]}-${m[1]}`;
  }
  return null;
}

export function parseCSV(content: string): ParsedTx[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const delim = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
  const out: ParsedTx[] = [];
  for (const line of lines) {
    const cells = line.split(delim).map((c) => c.trim());
    if (cells.length < 2) continue;
    let date: string | null = null;
    let amount: number | null = null;
    let descParts: string[] = [];
    for (const c of cells) {
      const d = parseDateCell(c);
      if (d && !date) {
        date = d;
        continue;
      }
      const a = normalizeAmount(c);
      if (a !== null && /\d/.test(c) && !/[a-zA-Z]{3,}/.test(c)) {
        amount = a;
        continue;
      }
      if (c) descParts.push(c);
    }
    if (date && amount !== null) {
      out.push({
        date,
        amount,
        description: descParts.sort((a, b) => b.length - a.length)[0] || "Importado",
        external_id: null,
      });
    }
  }
  return out;
}

export function parseStatement(filename: string, content: string): ParsedTx[] {
  const isOfx = /\.ofx$/i.test(filename) || /<OFX>|<STMTTRN>/i.test(content);
  return isOfx ? parseOFX(content) : parseCSV(content);
}
