import * as XLSX from "xlsx";

import { parseCsv } from "@/lib/import/csv";
import type { ImportRow } from "@/lib/import/types";

/**
 * Lê o primeiro sheet do XLSX e reaproveita o parser CSV.
 */
export function parseXlsx(buffer: ArrayBuffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ";", blankrows: false });
  const parsed = parseCsv(csv);
  // Renomear tmp_id pra refletir origem
  return parsed.map((r, i) => ({ ...r, tmp_id: `xlsx-${i}` }));
}
