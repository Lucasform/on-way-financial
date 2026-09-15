"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Receipt, Trash2, Trophy } from "lucide-react";
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
import { QuantityDialog } from "@/components/modules/quantity-dialog";
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
}

const UNITS = ["un", "m", "m2", "m3", "kg", "saco", "litro", "rolo", "barra", "caixa", "hora", "diária"];

interface Props {
  householdId: string;
  suppliers: Supplier[];
  initial: Quote[];
  canWrite: boolean;
}

export function ObraQuotesTab({ householdId, suppliers, initial, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [quotes, setQuotes] = useState(initial);
  const [pending, start] = useTransition();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [pendingAccept, setPendingAccept] = useState<Quote | null>(null);
  const [draft, setDraft] = useState<Partial<Quote>>({
    supplier_id: suppliers[0]?.id,
    unit: "un",
    quoted_at: todayISO(),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Quote[]>();
    for (const q of quotes) {
      const key = q.item_name.trim().toLowerCase();
      map.set(key, [...(map.get(key) ?? []), q]);
    }
    return [...map.entries()]
      .map(([key, list]) => ({
        key,
        name: list[0]!.item_name,
        list: list.sort((a, b) => Number(a.unit_price) - Number(b.unit_price)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [quotes]);

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

  function accept(q: Quote) {
    if (!canWrite || acceptingId || q.accepted_at) return;
    setPendingAccept(q);
  }

  async function confirmAccept(q: Quote, quantity: number) {
    setPendingAccept(null);
    setAcceptingId(q.id);
    try {
      const res = await fetch("/api/obra/accept-quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quote_id: q.id, quantity }),
      });
      if (res.status === 409) {
        toast.warning("Essa cotação já tinha sido aceita.");
        setQuotes((s) => s.map((x) => (x.id === q.id ? { ...x, accepted_at: x.accepted_at ?? new Date().toISOString() } : x)));
        return;
      }
      if (!res.ok) {
        toast.error("Falha ao aceitar cotação.");
        return;
      }
      setQuotes((s) => s.map((x) => (x.id === q.id ? { ...x, accepted_at: new Date().toISOString() } : x)));
      toast.success("Cotação aceita: virou compra e despesa. Veja em Materiais/Despesas.");
    } finally {
      setAcceptingId(null);
    }
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

      {grouped.length === 0 ? (
        <Empty icon={Receipt} title="Sem cotações" description="Registre preços de fornecedores diferentes pra comparar." />
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <Card key={g.key} className="overflow-hidden">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold">{g.name}</div>
              <ul className="divide-y divide-border">
                {g.list.map((q, idx) => (
                  <li key={q.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Trophy className="h-4 w-4 text-warning" />}
                      <div>
                        <p className="font-medium">{supplierName(q.supplier_id)}</p>
                        <p className="text-[10px] text-text-muted">
                          {fmtDate(q.quoted_at)}
                          {q.valid_until && ` · válido até ${fmtDate(q.valid_until)}`}
                        </p>
                      </div>
                      {idx === 0 && g.list.length > 1 && <Badge variant="success">melhor preço</Badge>}
                      {q.accepted_at && <Badge variant="secondary">aceita</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Money value={Number(q.unit_price)} size="sm" className="num font-medium" />
                      <span className="text-xs text-text-muted">/{q.unit}</span>
                      {canWrite && !q.accepted_at && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={acceptingId === q.id}
                          onClick={() => accept(q)}
                          aria-label="Aceitar cotação"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" onClick={() => remove(q.id)}>
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {pendingAccept && (
        <QuantityDialog
          itemName={pendingAccept.item_name}
          unit={pendingAccept.unit}
          onConfirm={(quantity) => confirmAccept(pendingAccept, quantity)}
          onCancel={() => setPendingAccept(null)}
        />
      )}
    </div>
  );
}
