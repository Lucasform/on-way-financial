"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { type CostRow, ObraCostsList } from "@/components/modules/obra-costs-list";
import type { SupplierOption } from "@/components/modules/quick-add-expense-dialog";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

interface Props {
  costs: CostRow[];
  suppliers: SupplierOption[];
  canWrite: boolean;
}

export function ObraGastoView({ costs, suppliers, canWrite }: Props) {
  const [query, setQuery] = useState("");
  const q = norm(query);

  const filtered = useMemo(
    () => (q ? costs.filter((c) => norm(c.name).includes(q) || norm(c.supplier_label).includes(q)) : costs),
    [costs, q],
  );

  const rows = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of filtered) totals.set(c.supplier_label, (totals.get(c.supplier_label) ?? 0) + c.amount);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const grandTotal = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      {costs.length > 0 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar lançamento ou fornecedor..."
            aria-label="Buscar lançamento ou fornecedor"
            className="h-10 w-full rounded-md border border-border bg-bg-elev pl-9 pr-9 text-sm outline-none focus:border-primary/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-text-muted">
          {q ? `Nada encontrado pra "${query.trim()}".` : "Nada gasto nesse período."}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map(([name, total]) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setQuery(name)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-bg-elev-2"
                  title="Ver só os lançamentos deste fornecedor"
                >
                  <span className="truncate font-medium">{name}</span>
                  <Money value={total} size="sm" className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-bg-elev-2 px-4 py-3 text-sm font-semibold">
            <span>{q ? "Total encontrado" : "Total"}</span>
            <Money value={grandTotal} size="sm" />
          </div>
        </Card>
      )}

      <ObraCostsList costs={filtered} suppliers={suppliers} canWrite={canWrite} />
    </>
  );
}
