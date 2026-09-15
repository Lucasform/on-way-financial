"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, ChevronUp, MapPin, MessageCircle, Plus, Receipt, ShoppingBag, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { fmtDate } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { waLink } from "@/lib/utils";
import type { Supplier } from "@/components/modules/obra-suppliers-tab";

export interface QuoteRow {
  id: string;
  item_name: string;
  unit: string;
  unit_price: number;
  quoted_at: string;
}

export interface PurchaseRow {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  actual_unit_price: number | null;
  status: string;
  bought_at: string | null;
}

interface Props {
  supplier: Supplier;
  quotes: QuoteRow[];
  purchases: PurchaseRow[];
  canWrite: boolean;
}

const CATEGORIES = ["material", "mão-de-obra", "equipamento", "serviço", "outro"];

export function ObraSupplierDetail({ supplier: initial, quotes, purchases, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [supplier, setSupplier] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [pending, start] = useTransition();

  function rate(rating: number) {
    if (!canWrite) return;
    setSupplier((s) => ({ ...s, rating }));
    start(async () => {
      await supabase.from("suppliers").update({ rating }).eq("id", supplier.id);
    });
  }

  function save() {
    if (!canWrite) return;
    start(async () => {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: draft.name.trim(),
          category: draft.category,
          phone: draft.phone,
          phone2: draft.phone2,
          cnpj: draft.cnpj,
          address: draft.address,
          notes: draft.notes,
        })
        .eq("id", supplier.id);
      if (error) {
        toast.error("Falha ao salvar.");
        return;
      }
      setSupplier(draft);
      setEditing(false);
      toast.success("Fornecedor atualizado.");
    });
  }

  function remove() {
    if (!canWrite) return;
    if (!confirm(`Apagar "${supplier.name}"?`)) return;
    start(async () => {
      const { error } = await supabase.from("suppliers").delete().eq("id", supplier.id);
      if (error) {
        toast.error("Falha ao apagar.");
        return;
      }
      router.push("/overview/fornecedores");
    });
  }

  const purchaseTotal = purchases.reduce(
    (s, p) => s + Number(p.quantity) * Number(p.actual_unit_price ?? p.unit_price ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="mb-1 text-lg font-semibold"
              />
            ) : (
              <h2 className="truncate text-lg font-semibold">{supplier.name}</h2>
            )}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" disabled={!canWrite} onClick={() => rate(n)} aria-label={`Nota ${n}`}>
                  <Star className={`h-4 w-4 ${(supplier.rating ?? 0) >= n ? "fill-warning text-warning" : "text-text-muted"}`} />
                </button>
              ))}
            </div>
          </div>
          {canWrite && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (editing ? save() : setEditing(true))}
                disabled={pending}
                aria-label={editing ? "Salvar" : "Editar"}
              >
                {editing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={remove} disabled={pending} aria-label="Apagar fornecedor">
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select
                value={draft.category ?? "material"}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={draft.cnpj ?? ""} onChange={(e) => setDraft({ ...draft, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>2º telefone</Label>
              <Input value={draft.phone2 ?? ""} onChange={(e) => setDraft({ ...draft, phone2: e.target.value })} placeholder="(11) 98888-8888" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notas</Label>
              <Input value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            {supplier.category && (
              <p className="flex items-center gap-1.5 text-text-muted">
                <Building2 className="h-3.5 w-3.5" /> {supplier.category}
                {supplier.cnpj && <> · CNPJ {supplier.cnpj}</>}
              </p>
            )}
            {supplier.phone && (
              <a href={waLink(supplier.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                <MessageCircle className="h-3.5 w-3.5" /> {supplier.phone}
              </a>
            )}
            {supplier.phone2 && (
              <a href={waLink(supplier.phone2)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                <MessageCircle className="h-3.5 w-3.5" /> {supplier.phone2}
              </a>
            )}
            {supplier.address && (
              <p className="flex items-center gap-1.5 text-text-muted">
                <MapPin className="h-3.5 w-3.5" /> {supplier.address}
              </p>
            )}
            {supplier.notes && <p className="text-text-muted">{supplier.notes}</p>}
          </div>
        )}
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Receipt className="h-4 w-4" /> Orçamentos
          </h3>
          <Button asChild variant="outline" size="sm">
            <Link href="/overview/cotacoes"><Plus className="h-3.5 w-3.5" /> Nova cotação</Link>
          </Button>
        </div>
        {quotes.length === 0 ? (
          <Empty icon={Receipt} title="Sem cotações" description="Registre o preço que esse fornecedor passou." />
        ) : (
          <Card className="divide-y divide-border">
            {quotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{q.item_name}</p>
                  <p className="text-xs text-text-muted">{fmtDate(q.quoted_at, "dd/MM/yyyy")} · {q.unit}</p>
                </div>
                <Money value={q.unit_price} size="sm" className="shrink-0" />
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4" /> Já compramos
          </h3>
          {purchases.length > 0 && <Money value={purchaseTotal} size="sm" tone="muted" />}
        </div>
        {purchases.length === 0 ? (
          <Empty icon={ShoppingBag} title="Nada comprado ainda" description="Itens marcados como comprados aparecem aqui." />
        ) : (
          <Card className="divide-y divide-border">
            {purchases.map((p) => {
              const total = Number(p.quantity) * Number(p.actual_unit_price ?? p.unit_price ?? 0);
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {Number(p.quantity)} {p.unit}
                      {p.bought_at && <> · {fmtDate(p.bought_at, "dd/MM/yyyy")}</>}
                    </p>
                  </div>
                  <Money value={total} size="sm" className="shrink-0" />
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
