"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, ChevronUp, MapPin, MessageCircle, Plus, Receipt, ShoppingBag, Star, Trash2 } from "lucide-react";
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
  accepted_at: string | null;
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

export function ObraSupplierDetail({ supplier: initial, quotes: initialQuotes, purchases: initialPurchases, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [supplier, setSupplier] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [pending, start] = useTransition();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<Partial<QuoteRow>>({});
  const [savingQuote, setSavingQuote] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseDraft, setPurchaseDraft] = useState<Partial<PurchaseRow>>({});
  const [savingPurchase, setSavingPurchase] = useState(false);

  function openQuote(q: QuoteRow) {
    if (!canWrite) return;
    if (editingQuoteId === q.id) {
      setEditingQuoteId(null);
      return;
    }
    setQuoteDraft(q);
    setEditingQuoteId(q.id);
  }

  async function saveQuote(id: string) {
    setSavingQuote(true);
    try {
      const { error } = await supabase
        .from("price_quotes")
        .update({
          item_name: quoteDraft.item_name?.trim(),
          unit: quoteDraft.unit,
          unit_price: quoteDraft.unit_price,
          quoted_at: quoteDraft.quoted_at,
        })
        .eq("id", id);
      if (error) {
        toast.error("Falha ao salvar cotação.");
        return;
      }
      setQuotes((s) => s.map((q) => (q.id === id ? { ...q, ...quoteDraft } as QuoteRow : q)));
      setEditingQuoteId(null);
      toast.success("Cotação atualizada.");
    } finally {
      setSavingQuote(false);
    }
  }

  async function reopenQuote(id: string) {
    if (!canWrite) return;
    if (!confirm("Voltar essa cotação pro estado aberta? Isso não apaga a compra/despesa se ela ainda existir — pra isso, apague em Realizado.")) return;
    const { error } = await supabase.from("price_quotes").update({ accepted_at: null }).eq("id", id);
    if (error) {
      toast.error("Falha ao reabrir.");
      return;
    }
    setQuotes((s) => s.map((q) => (q.id === id ? { ...q, accepted_at: null } : q)));
    toast.success("Cotação reaberta.");
  }

  function openPurchase(p: PurchaseRow) {
    if (!canWrite) return;
    if (editingPurchaseId === p.id) {
      setEditingPurchaseId(null);
      return;
    }
    setPurchaseDraft(p);
    setEditingPurchaseId(p.id);
  }

  async function savePurchase(id: string) {
    setSavingPurchase(true);
    try {
      const { error } = await supabase
        .from("obra_items")
        .update({
          name: purchaseDraft.name?.trim(),
          quantity: purchaseDraft.quantity,
          unit: purchaseDraft.unit,
          actual_unit_price: purchaseDraft.actual_unit_price,
          bought_at: purchaseDraft.bought_at,
        })
        .eq("id", id);
      if (error) {
        toast.error("Falha ao salvar item.");
        return;
      }
      setPurchases((s) => s.map((p) => (p.id === id ? { ...p, ...purchaseDraft } as PurchaseRow : p)));
      setEditingPurchaseId(null);
      toast.success("Item atualizado.");
    } finally {
      setSavingPurchase(false);
    }
  }

  async function acceptQuote(quote: QuoteRow) {
    if (!canWrite || acceptingId || quote.accepted_at) return;
    const raw = prompt(`Quantidade de "${quote.item_name}" (${quote.unit}):`, "1");
    if (raw === null) return;
    const quantity = Number(raw.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantidade inválida.");
      return;
    }
    setAcceptingId(quote.id);
    try {
      const res = await fetch("/api/obra/accept-quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id, quantity }),
      });
      if (res.status === 409) {
        toast.warning("Essa cotação já tinha sido aceita.");
        setQuotes((s) => s.map((x) => (x.id === quote.id ? { ...x, accepted_at: x.accepted_at ?? new Date().toISOString() } : x)));
        return;
      }
      if (!res.ok) {
        toast.error("Falha ao aceitar cotação.");
        return;
      }
      const data = await res.json();
      setQuotes((s) => s.map((x) => (x.id === quote.id ? { ...x, accepted_at: new Date().toISOString() } : x)));
      setPurchases((s) => [
        {
          id: data.item.id,
          name: data.item.name,
          quantity: data.item.quantity,
          unit: data.item.unit,
          unit_price: data.item.unit_price,
          actual_unit_price: data.item.actual_unit_price,
          status: data.item.status,
          bought_at: data.item.bought_at,
        },
        ...s,
      ]);
      toast.success("Cotação aceita: virou compra e despesa.");
    } finally {
      setAcceptingId(null);
    }
  }

  async function removePurchase(itemId: string) {
    if (!canWrite || removingId) return;
    if (!confirm("Apagar esse item realizado? A despesa lançada junto some, e se veio de uma cotação aceita ela volta a poder ser aceita de novo.")) return;
    setRemovingId(itemId);
    try {
      const res = await fetch("/api/obra/revert-purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (!res.ok) {
        toast.error("Falha ao apagar.");
        return;
      }
      const data = (await res.json()) as { quote_id: string | null };
      setPurchases((s) => s.filter((p) => p.id !== itemId));
      if (data.quote_id) {
        setQuotes((s) => s.map((q) => (q.id === data.quote_id ? { ...q, accepted_at: null } : q)));
      }
      toast.success("Removido.");
    } finally {
      setRemovingId(null);
    }
  }

  function onDropQuote(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(false);
    const id = e.dataTransfer.getData("text/quote-id");
    const quote = quotes.find((q) => q.id === id);
    if (quote) void acceptQuote(quote);
  }

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
        {canWrite && quotes.length > 0 && (
          <p className="mb-2 text-[11px] text-text-muted">
            Clique em <Check className="inline h-3 w-3" /> pra aceitar (vira compra + despesa), ou arraste pra &quot;Realizado&quot;.
          </p>
        )}
        {quotes.length === 0 ? (
          <Empty icon={Receipt} title="Sem cotações" description="Registre o preço que esse fornecedor passou." />
        ) : (
          <Card className="divide-y divide-border">
            {quotes.map((q) => {
              const draggableNow = canWrite && !q.accepted_at;
              const isEditing = editingQuoteId === q.id;
              return (
                <div key={q.id}>
                  <div
                    draggable={draggableNow}
                    onDragStart={(e) => draggableNow && e.dataTransfer.setData("text/quote-id", q.id)}
                    onClick={() => openQuote(q)}
                    className={`flex items-center justify-between gap-3 p-3 text-sm ${canWrite ? "cursor-pointer hover:bg-bg-elev-2" : ""} ${draggableNow ? "active:cursor-grabbing" : ""} ${q.accepted_at ? "opacity-60" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{q.item_name}</p>
                      <p className="text-xs text-text-muted">{fmtDate(q.quoted_at, "dd/MM/yyyy")} · {q.unit}</p>
                    </div>
                    <Money value={q.unit_price} size="sm" className="shrink-0" />
                    {q.accepted_at &&
                      (canWrite ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            reopenQuote(q.id);
                          }}
                          className="shrink-0"
                          aria-label="Reabrir cotação"
                        >
                          <Badge variant="secondary">aceita · reabrir</Badge>
                        </button>
                      ) : (
                        <Badge variant="secondary">aceita</Badge>
                      ))}
                    {canWrite && !q.accepted_at && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={acceptingId === q.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptQuote(q);
                        }}
                        aria-label="Aceitar cotação"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {isEditing && (
                    <div className="grid gap-2 border-t border-border bg-bg-elev-2 p-3 sm:grid-cols-4">
                      <Input
                        value={quoteDraft.item_name ?? ""}
                        onChange={(e) => setQuoteDraft({ ...quoteDraft, item_name: e.target.value })}
                        placeholder="Item"
                        className="sm:col-span-2"
                      />
                      <Input
                        value={quoteDraft.unit ?? ""}
                        onChange={(e) => setQuoteDraft({ ...quoteDraft, unit: e.target.value })}
                        placeholder="Unidade"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteDraft.unit_price ?? ""}
                        onChange={(e) => setQuoteDraft({ ...quoteDraft, unit_price: Number(e.target.value) })}
                        placeholder="Preço"
                      />
                      <Input
                        type="date"
                        value={quoteDraft.quoted_at ?? ""}
                        onChange={(e) => setQuoteDraft({ ...quoteDraft, quoted_at: e.target.value })}
                        className="sm:col-span-2"
                      />
                      <div className="flex gap-2 sm:col-span-2 sm:justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingQuoteId(null)}>Cancelar</Button>
                        <Button size="sm" disabled={savingQuote} onClick={() => saveQuote(q.id)}>Salvar</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <section
        onDragOver={(e) => {
          if (!canWrite) return;
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={onDropQuote}
        className={dropActive ? "rounded-lg ring-2 ring-primary/60 transition-shadow" : ""}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4" /> Realizado
          </h3>
          {purchases.length > 0 && <Money value={purchaseTotal} size="sm" tone="muted" />}
        </div>
        {purchases.length === 0 ? (
          <Empty
            icon={ShoppingBag}
            title="Nada comprado ainda"
            description={canWrite ? "Aceite uma cotação acima ou arraste ela pra cá." : "Itens comprados aparecem aqui."}
          />
        ) : (
          <Card className="divide-y divide-border">
            {purchases.map((p) => {
              const total = Number(p.quantity) * Number(p.actual_unit_price ?? p.unit_price ?? 0);
              const isEditing = editingPurchaseId === p.id;
              return (
                <div key={p.id}>
                <div
                  onClick={() => openPurchase(p)}
                  className={`flex items-center justify-between gap-3 p-3 text-sm ${canWrite ? "cursor-pointer hover:bg-bg-elev-2" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {Number(p.quantity)} {p.unit}
                      {p.bought_at && <> · {fmtDate(p.bought_at, "dd/MM/yyyy")}</>}
                    </p>
                  </div>
                  <Money value={total} size="sm" className="shrink-0" />
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={removingId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        removePurchase(p.id);
                      }}
                      aria-label="Apagar"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  )}
                </div>
                {isEditing && (
                  <div className="grid gap-2 border-t border-border bg-bg-elev-2 p-3 sm:grid-cols-4">
                    <Input
                      value={purchaseDraft.name ?? ""}
                      onChange={(e) => setPurchaseDraft({ ...purchaseDraft, name: e.target.value })}
                      placeholder="Item"
                      className="sm:col-span-2"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={purchaseDraft.quantity ?? ""}
                      onChange={(e) => setPurchaseDraft({ ...purchaseDraft, quantity: Number(e.target.value) })}
                      placeholder="Quantidade"
                    />
                    <Input
                      value={purchaseDraft.unit ?? ""}
                      onChange={(e) => setPurchaseDraft({ ...purchaseDraft, unit: e.target.value })}
                      placeholder="Unidade"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={purchaseDraft.actual_unit_price ?? ""}
                      onChange={(e) => setPurchaseDraft({ ...purchaseDraft, actual_unit_price: Number(e.target.value) })}
                      placeholder="Preço pago"
                    />
                    <Input
                      type="date"
                      value={purchaseDraft.bought_at ?? ""}
                      onChange={(e) => setPurchaseDraft({ ...purchaseDraft, bought_at: e.target.value })}
                    />
                    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingPurchaseId(null)}>Cancelar</Button>
                      <Button size="sm" disabled={savingPurchase} onClick={() => savePurchase(p.id)}>Salvar</Button>
                    </div>
                  </div>
                )}
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
