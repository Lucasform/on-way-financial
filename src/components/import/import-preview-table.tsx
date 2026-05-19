"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { fmtDate } from "@/lib/dates";
import type { ImportRow } from "@/lib/import/types";
import { cn } from "@/lib/utils";

interface Props {
  rows: ImportRow[];
  onChange: (rows: ImportRow[]) => void;
  categories: { id: string; name: string; type: string; color: string | null; icon: string | null }[];
  methods: { id: string; name: string; kind: string }[];
}

export function ImportPreviewTable({ rows, onChange, categories, methods }: Props) {
  function update(tmpId: string, patch: Partial<ImportRow>) {
    onChange(rows.map((r) => (r.tmp_id === tmpId ? { ...r, ...patch } : r)));
  }

  function toggleAll(selected: boolean) {
    onChange(rows.map((r) => ({ ...r, selected })));
  }

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const someSelected = rows.some((r) => r.selected);

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-bg-elev-2 text-xs uppercase text-text-muted">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-left">Método</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const eligibleCats = categories.filter((c) =>
                r.type === "income" ? c.type === "income" : c.type === "expense",
              );
              return (
                <tr
                  key={r.tmp_id}
                  className={cn(
                    "transition-colors",
                    r.is_duplicate
                      ? "bg-warning/5 hover:bg-warning/10"
                      : !r.selected
                        ? "bg-bg-elev-2/30 opacity-60"
                        : "hover:bg-bg-elev-2/50",
                  )}
                >
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={r.selected}
                      onChange={(e) => update(r.tmp_id, { selected: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <Input
                      type="date"
                      value={r.occurred_at}
                      onChange={(e) => update(r.tmp_id, { occurred_at: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex flex-col gap-1">
                      <Input
                        value={r.description}
                        onChange={(e) => update(r.tmp_id, { description: e.target.value })}
                        className="h-7 text-xs"
                      />
                      {r.is_duplicate && (
                        <Badge variant="warning" className="self-start">
                          <AlertTriangle className="h-3 w-3" /> possível duplicata
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <select
                      value={r.category_hint ?? ""}
                      onChange={(e) => update(r.tmp_id, { category_hint: e.target.value || null })}
                      className="h-7 w-full rounded-md border border-border bg-bg-elev px-2 text-xs"
                    >
                      <option value="">—</option>
                      {eligibleCats.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <select
                      value={r.payment_hint ?? ""}
                      onChange={(e) =>
                        update(r.tmp_id, {
                          payment_hint: (e.target.value || null) as ImportRow["payment_hint"],
                        })
                      }
                      className="h-7 w-full rounded-md border border-border bg-bg-elev px-2 text-xs"
                    >
                      <option value="">—</option>
                      <option value="pix">PIX</option>
                      <option value="credit_card">Crédito</option>
                      <option value="debit_card">Débito</option>
                      <option value="cash">Dinheiro</option>
                      <option value="bank_transfer">Transferência</option>
                      <option value="boleto">Boleto</option>
                      <option value="meal_voucher">Vale-refeição</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right align-middle">
                    <Money
                      value={r.amount}
                      tone={r.type === "income" ? "success" : "default"}
                      size="sm"
                      className="num"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
