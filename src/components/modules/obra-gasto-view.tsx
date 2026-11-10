"use client";

import { ArrowUpDown, Search, X } from "lucide-react";
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

type SortKey = "padrao" | "maior" | "menor" | "recente" | "antigo" | "nome";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "maior", label: "Maior valor" },
  { value: "menor", label: "Menor valor" },
  { value: "recente", label: "Mais recente" },
  { value: "antigo", label: "Mais antigo" },
  { value: "nome", label: "Nome (A-Z)" },
];

const byName = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

interface Props {
  costs: CostRow[];
  suppliers: SupplierOption[];
  canWrite: boolean;
}

export function ObraGastoView({ costs, suppliers, canWrite }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("padrao");
  const q = norm(query);

  const filtered = useMemo(
    () =>
      q
        ? costs.filter((c) => norm(c.name).includes(q) || norm(c.supplier_label).includes(q))
        : costs,
    [costs, q],
  );

  const sortedCosts = useMemo(() => {
    if (sort === "padrao") return filtered;
    const list = [...filtered];
    const date = (c: CostRow) => c.bought_at ?? "";
    if (sort === "maior") list.sort((a, b) => b.amount - a.amount);
    else if (sort === "menor") list.sort((a, b) => a.amount - b.amount);
    else if (sort === "recente") list.sort((a, b) => date(b).localeCompare(date(a)));
    else if (sort === "antigo")
      list.sort((a, b) => (date(a) || "9999").localeCompare(date(b) || "9999"));
    else list.sort((a, b) => byName(a.name, b.name));
    return list;
  }, [filtered, sort]);

  const rows = useMemo(() => {
    const totals = new Map<string, { total: number; last: string }>();
    for (const c of filtered) {
      const cur = totals.get(c.supplier_label) ?? { total: 0, last: "" };
      const d = c.bought_at ?? "";
      totals.set(c.supplier_label, {
        total: cur.total + c.amount,
        last: d > cur.last ? d : cur.last,
      });
    }
    const list = [...totals.entries()];
    if (sort === "menor") list.sort((a, b) => a[1].total - b[1].total);
    else if (sort === "recente") list.sort((a, b) => b[1].last.localeCompare(a[1].last));
    else if (sort === "antigo")
      list.sort((a, b) => (a[1].last || "9999").localeCompare(b[1].last || "9999"));
    else if (sort === "nome") list.sort((a, b) => byName(a[0], b[0]));
    else list.sort((a, b) => b[1].total - a[1].total);
    return list.map(([name, v]) => [name, v.total] as const);
  }, [filtered, sort]);
  const grandTotal = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      {costs.length > 0 && (
        <div className="mb-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lançamento ou fornecedor..."
              aria-label="Buscar lançamento ou fornecedor"
              className="focus:border-primary/60 h-10 w-full rounded-md border border-border bg-bg-elev pl-9 pr-9 text-sm outline-none"
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
          <label className="relative flex shrink-0 items-center">
            <ArrowUpDown className="pointer-events-none absolute left-2.5 h-4 w-4 text-text-muted" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Ordenar"
              className="focus:border-primary/60 h-10 appearance-none rounded-md border border-border bg-bg-elev pl-8 pr-3 text-sm outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
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

      <ObraCostsList costs={sortedCosts} suppliers={suppliers} canWrite={canWrite} />
    </>
  );
}
