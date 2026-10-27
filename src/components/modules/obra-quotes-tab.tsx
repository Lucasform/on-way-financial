"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Play, Plus, Receipt, Search, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate, todayISO } from "@/lib/dates";
import {
  ExecuteQuoteDialog,
  QuotePaymentsPanel,
  QuoteProgressText,
  quoteStatus,
  type ExecutionSnapshot,
  type QuotePayment,
  type QuoteStatus,
} from "@/components/modules/quote-execution";
import type { Supplier } from "@/components/modules/obra-suppliers-tab";

export interface Quote {
  id: string;
  supplier_id: string;
  item_name: string;
  unit: string;
  unit_price: number;
  quoted_at: string;
  valid_until: string | null;
  notes: string | null;
  accepted_at: string | null;
  execution_started_at: string | null;
  total_amount: number | null;
}

const UNITS = ["un", "m", "m2", "m3", "kg", "saco", "litro", "rolo", "barra", "caixa", "hora", "diária"];

const SORT_OPTIONS = [
  { value: "item-asc", label: "Item (A-Z)" },
  { value: "item-desc", label: "Item (Z-A)" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "recent", label: "Mais recente" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

interface Props {
  householdId: string;
  suppliers: Supplier[];
  initial: Quote[];
  initialPayments: QuotePayment[];
  initialTab?: QuoteStatus;
  canWrite: boolean;
}

export function ObraQuotesTab({ householdId, suppliers, initial, initialPayments, initialTab = "aberto", canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [quotes, setQuotes] = useState(initial);
  const [pending, start] = useTransition();
  const [payments, setPayments] = useState(initialPayments);
  const [executing, setExecuting] = useState<Quote | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>("item-asc");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [activeTab, setActiveTab] = useState<QuoteStatus>(initialTab);
  const [draft, setDraft] = useState<Partial<Quote>>({
    supplier_id: suppliers[0]?.id,
    unit: "un",
    quoted_at: todayISO(),
  });

  const counts = useMemo(() => {
    const c: Record<QuoteStatus, number> = { aberto: 0, execucao: 0, aceita: 0 };
    for (const q of quotes) c[quoteStatus(q)]++;
    return c;
  }, [quotes]);

  const paymentsByQuote = useMemo(() => {
    const m = new Map<string, QuotePayment[]>();
    for (const p of payments) m.set(p.quote_id, [...(m.get(p.quote_id) ?? []), p]);
    return m;
  }, [payments]);

  const grouped = useMemo(() => {
    const tabQuotes = quotes.filter((quote) => quoteStatus(quote) === activeTab);
    const q = supplierQuery.trim().toLowerCase();
    const filteredQuotes = q
      ? tabQuotes.filter((quote) => {
          const supplier = suppliers.find((s) => s.id === quote.supplier_id);
          return supplier?.name.toLowerCase().includes(q) ?? false;
        })
      : tabQuotes;
    const map = new Map<string, Quote[]>();
    for (const quote of filteredQuotes) {
      const key = quote.item_name.trim().toLowerCase();
      map.set(key, [...(map.get(key) ?? []), quote]);
    }
    const groups = [...map.entries()].map(([key, list]) => ({
      key,
      name: list[0]!.item_name,
      list: list.sort((a, b) => Number(a.unit_price) - Number(b.unit_price)),
    }));
    switch (sort) {
      case "item-desc":
        return groups.sort((a, b) => b.name.localeCompare(a.name));
      case "price-asc":
        return groups.sort((a, b) => Number(a.list[0]!.unit_price) - Number(b.list[0]!.unit_price));
      case "price-desc":
        return groups.sort((a, b) => Number(b.list[0]!.unit_price) - Number(a.list[0]!.unit_price));
      case "recent":
        return groups.sort((a, b) => {
          const aRecent = a.list.reduce((m, q) => (q.quoted_at > m ? q.quoted_at : m), a.list[0]!.quoted_at);
          const bRecent = b.list.reduce((m, q) => (q.quoted_at > m ? q.quoted_at : m), b.list[0]!.quoted_at);
          return bRecent.localeCompare(aRecent);
        });
      case "item-asc":
      default:
        return groups.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [quotes, sort, suppliers, supplierQuery, activeTab]);

  function supplierName(id: string): string {
    return suppliers.find((s) => s.id === id)?.name ?? "—";
  }

  function add() {
    const itemName = draft.item_name?.trim();
    const supplierId = draft.supplier_id;
    const unitPrice = draft.unit_price;
    if (!canWrite || !itemName || !supplierId || unitPrice == null) return;
    start(async () => {
      const { data, error } = await supabase
        .from("price_quotes")
        .insert({
          household_id: householdId,
          supplier_id: supplierId,
          item_name: itemName,
          unit: draft.unit ?? "un",
          unit_price: unitPrice,
          quoted_at: draft.quoted_at || todayISO(),
          valid_until: draft.valid_until || null,
          notes: draft.notes || null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao registrar cotação.");
        return;
      }
      setQuotes((s) => [data as Quote, ...s]);
      setDraft({ supplier_id: suppliers[0]?.id, unit: "un", quoted_at: todayISO() });
      toast.success("Cotação registrada.");
    });
  }

  function applySnapshot(snap: ExecutionSnapshot<Quote>) {
    setQuotes((s) => s.map((x) => (x.id === snap.quote.id ? snap.quote : x)));
    setPayments((s) => [...s.filter((p) => p.quote_id !== snap.quote.id), ...snap.payments]);
    const status = quoteStatus(snap.quote);
    setActiveTab(status);
    setExpandedId(status === "execucao" ? snap.quote.id : null);
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      const { error } = await supabase.from("price_quotes").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao remover.");
        return;
      }
      setQuotes((s) => s.filter((x) => x.id !== id));
    });
  }

  if (suppliers.length === 0) {
    return (
      <Empty
        icon={Receipt}
        title="Cadastre um fornecedor primeiro"
        description="Cotações precisam de um fornecedor vinculado. Vá na aba Fornecedores."
      />
    );
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Nova cotação</p>
          <div className="grid gap-2 sm:grid-cols-6">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="qname">Item</Label>
              <Input
                id="qname"
                value={draft.item_name ?? ""}
                onChange={(e) => setDraft({ ...draft, item_name: e.target.value })}
                placeholder='Ex: "Cimento CP-II 50kg"'
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qsup">Fornecedor</Label>
              <select
                id="qsup"
                value={draft.supplier_id ?? ""}
                onChange={(e) => setDraft({ ...draft, supplier_id: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qunit">Unidade</Label>
              <select
                id="qunit"
                value={draft.unit ?? "un"}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qprice">Preço unitário</Label>
              <Input
                id="qprice"
                type="number"
                step="0.01"
                value={draft.unit_price ?? ""}
                onChange={(e) => setDraft({ ...draft, unit_price: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={add} disabled={pending || !draft.item_name?.trim() || draft.unit_price == null} className="w-full">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["aberto", "Em aberto"],
            ["execucao", "Em execução"],
            ["aceita", "Aceita"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-text-muted hover:bg-bg-elev-2"
            }`}
          >
            {label} ({counts[value]})
          </button>
        ))}
      </div>

      {quotes.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
              placeholder="Buscar por fornecedor..."
              aria-label="Buscar cotações por fornecedor"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            aria-label="Ordenar cotações"
            className="h-8 shrink-0 rounded-md border border-border bg-bg-elev px-2 text-xs"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {grouped.length === 0 ? (
        <Empty
          icon={Receipt}
          title={
            supplierQuery.trim()
              ? "Nenhuma cotação desse fornecedor"
              : activeTab === "aceita"
                ? "Nenhuma cotação aceita ainda"
                : activeTab === "execucao"
                  ? "Nada em execução"
                  : "Sem cotações em aberto"
          }
          description={
            supplierQuery.trim()
              ? "Tenta buscar por outro nome."
              : activeTab === "aceita"
                ? "Cotação paga por inteiro aparece aqui."
                : activeTab === "execucao"
                  ? "Cotação com pagamento parcial ou agendado aparece aqui até quitar."
                  : "Registre preços de fornecedores diferentes pra comparar."
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <Card key={g.key} className="overflow-hidden">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold">{g.name}</div>
              <ul className="divide-y divide-border">
                {g.list.map((q, idx) => {
                  const status = quoteStatus(q);
                  const qPayments = paymentsByQuote.get(q.id) ?? [];
                  const expanded = expandedId === q.id;
                  const best = status === "aberto" && idx === 0;
                  return (
                    <li key={q.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          {best && <Trophy className="h-4 w-4 shrink-0 text-warning" />}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{supplierName(q.supplier_id)}</p>
                            {status === "execucao" ? (
                              <QuoteProgressText quote={q} payments={qPayments} />
                            ) : (
                              <p className="text-[10px] text-text-muted">
                                {fmtDate(q.quoted_at)}
                                {q.valid_until && ` · válido até ${fmtDate(q.valid_until)}`}
                              </p>
                            )}
                          </div>
                          {best && g.list.length > 1 && <Badge variant="success">melhor preço</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Money value={Number(q.unit_price)} size="sm" className="num font-medium" />
                          <span className="text-xs text-text-muted">/{q.unit}</span>
                          {canWrite && status === "aberto" && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setExecuting(q)}>
                              <Play className="h-3 w-3" /> Executar
                            </Button>
                          )}
                          {status === "execucao" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setExpandedId(expanded ? null : q.id)}
                            >
                              Pagamentos {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          )}
                          {canWrite && status === "aberto" && (
                            <Button variant="ghost" size="icon" onClick={() => remove(q.id)} aria-label="Apagar cotação">
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {status === "execucao" && expanded && (
                        <QuotePaymentsPanel quote={q} payments={qPayments} canWrite={canWrite} onChange={applySnapshot} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {executing && (
        <ExecuteQuoteDialog
          quote={executing}
          onCancel={() => setExecuting(null)}
          onDone={(snap) => {
            setExecuting(null);
            applySnapshot(snap);
          }}
        />
      )}
    </div>
  );
}
