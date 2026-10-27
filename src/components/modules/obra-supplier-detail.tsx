"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, CheckCircle2, ChevronDown, ChevronUp, Circle, FileText, Loader2, MapPin, MessageCircle, Plus, Receipt, ShoppingBag, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { useConfirm } from "@/hooks/use-confirm";
import { fmtDate, todayISO } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { uploadObraFile } from "@/lib/supabase/obra-storage";
import { waLink } from "@/lib/utils";
import { QuantityDialog } from "@/components/modules/quantity-dialog";
import { QuickAddExpenseDialog } from "@/components/modules/quick-add-expense-dialog";
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

export interface BudgetFile {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

interface Props {
  supplier: Supplier;
  householdId: string;
  moduleId: string;
  quotes: QuoteRow[];
  purchases: PurchaseRow[];
  budgetFiles: BudgetFile[];
  canWrite: boolean;
}

function fmtFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORIES = ["material", "mão-de-obra", "equipamento", "serviço", "outro"];
const UNITS = ["un", "m", "m2", "m3", "kg", "saco", "litro", "rolo", "barra", "caixa", "hora", "diária"];

export function ObraSupplierDetail({ supplier: initial, householdId, moduleId, quotes: initialQuotes, purchases: initialPurchases, budgetFiles: initialBudgetFiles, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [supplier, setSupplier] = useState(initial);
  const [editing, setEditing] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const [draft, setDraft] = useState(initial);
  const [pending, start] = useTransition();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [budgetFiles, setBudgetFiles] = useState(initialBudgetFiles);
  const [uploadingBudget, setUploadingBudget] = useState(false);
  const [removingBudgetId, setRemovingBudgetId] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [pendingAccept, setPendingAccept] = useState<QuoteRow | null>(null);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [newQuote, setNewQuote] = useState({ item_name: "", unit: "un", unit_price: "", quoted_at: todayISO() });
  const [savingNewQuote, setSavingNewQuote] = useState(false);
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

  async function removeQuote(id: string) {
    if (!canWrite) return;
    if (!confirm("Apagar essa cotação?")) return;
    setSavingQuote(true);
    try {
      const { error } = await supabase.from("price_quotes").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao apagar cotação.");
        return;
      }
      setQuotes((s) => s.filter((q) => q.id !== id));
      setEditingQuoteId(null);
      toast.success("Cotação apagada.");
    } finally {
      setSavingQuote(false);
    }
  }

  async function addNewQuote() {
    if (!canWrite || !newQuote.item_name.trim() || !newQuote.unit_price) return;
    setSavingNewQuote(true);
    try {
      const { data, error } = await supabase
        .from("price_quotes")
        .insert({
          household_id: householdId,
          supplier_id: supplier.id,
          item_name: newQuote.item_name.trim(),
          unit: newQuote.unit,
          unit_price: Number(newQuote.unit_price),
          quoted_at: newQuote.quoted_at || todayISO(),
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao registrar cotação.");
        return;
      }
      setQuotes((s) => [data as QuoteRow, ...s]);
      setNewQuote({ item_name: "", unit: "un", unit_price: "", quoted_at: todayISO() });
      setShowAddQuote(false);
      toast.success("Cotação registrada.");
    } finally {
      setSavingNewQuote(false);
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

  async function toggleDone(p: PurchaseRow) {
    if (!canWrite) return;
    const done = p.status === "done";
    const nextStatus = done ? "todo" : "done";
    const nextBoughtAt = done ? null : todayISO();
    setPurchases((s) => s.map((x) => (x.id === p.id ? { ...x, status: nextStatus, bought_at: nextBoughtAt } : x)));
    const { error } = await supabase
      .from("obra_items")
      .update({ status: nextStatus, bought_at: nextBoughtAt })
      .eq("id", p.id);
    if (error) {
      setPurchases((s) => s.map((x) => (x.id === p.id ? { ...x, status: p.status, bought_at: p.bought_at } : x)));
      toast.error("Falha ao atualizar.");
    }
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

  function acceptQuote(quote: QuoteRow) {
    if (!canWrite || acceptingId || quote.accepted_at) return;
    setPendingAccept(quote);
  }

  async function confirmAccept(quote: QuoteRow, quantity: number) {
    setPendingAccept(null);
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
      toast.success("Cotação aceita: virou custo a fazer.");
    } finally {
      setAcceptingId(null);
    }
  }

  async function removePurchase(itemId: string) {
    if (!canWrite || removingId) return;
    if (!(await confirm("Apagar esse custo? Se veio de uma cotação aceita, ela volta a poder ser aceita de novo.", { danger: true }))) return;
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

  async function uploadBudgetFiles(files: FileList | null) {
    if (!canWrite || !files || files.length === 0) return;
    setUploadingBudget(true);
    try {
      let okCount = 0;
      for (const file of Array.from(files)) {
        const result = await uploadObraFile(supabase, "obra-documents", householdId, moduleId, file);
        if ("error" in result) {
          toast.error(`Falha no upload de "${file.name}": ${result.error}`);
          continue;
        }
        const { data, error } = await supabase
          .from("supplier_budget_files")
          .insert({
            module_id: moduleId,
            supplier_id: supplier.id,
            name: file.name,
            file_url: result.url,
            file_type: file.type || null,
            size_bytes: file.size,
          })
          .select("*")
          .single();
        if (error || !data) {
          toast.error(`Falha ao salvar "${file.name}".`);
          continue;
        }
        setBudgetFiles((s) => [data as BudgetFile, ...s]);
        okCount += 1;
      }
      if (okCount > 0) toast.success(okCount === 1 ? "PDF adicionado." : `${okCount} PDFs adicionados.`);
    } finally {
      setUploadingBudget(false);
    }
  }

  async function removeBudgetFile(f: BudgetFile) {
    if (!canWrite) return;
    if (!(await confirm(`Apagar "${f.name}"?`, { danger: true }))) return;
    setRemovingBudgetId(f.id);
    try {
      const marker = "/obra-documents/";
      const idx = f.file_url.indexOf(marker);
      const storagePath = idx >= 0 ? f.file_url.slice(idx + marker.length) : null;
      if (storagePath) {
        await supabase.storage.from("obra-documents").remove([decodeURIComponent(storagePath)]);
      }
      const { error } = await supabase.from("supplier_budget_files").delete().eq("id", f.id);
      if (error) {
        toast.error("Falha ao apagar.");
        return;
      }
      setBudgetFiles((s) => s.filter((x) => x.id !== f.id));
    } finally {
      setRemovingBudgetId(null);
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

  async function remove() {
    if (!canWrite) return;
    if (!(await confirm(`Apagar "${supplier.name}"?`, { danger: true }))) return;
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
      {ConfirmDialog}
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
            <FileText className="h-4 w-4" /> PDF do orçamento
          </h3>
          {canWrite && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline">
              {uploadingBudget ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Adicionar PDF
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                disabled={uploadingBudget}
                onChange={(e) => {
                  void uploadBudgetFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {budgetFiles.length === 0 ? (
          <Empty icon={FileText} title="Sem PDF ainda" description="Anexe o orçamento que esse fornecedor enviou. Pode subir mais de um." />
        ) : (
          <Card className="divide-y divide-border">
            {budgetFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-elev-2 text-text-muted">
                  <FileText className="h-4 w-4" />
                </span>
                <a href={f.file_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="text-xs text-text-muted">
                    {fmtDate(f.created_at, "dd/MM/yyyy")}
                    {f.size_bytes ? ` · ${fmtFileSize(f.size_bytes)}` : ""}
                  </p>
                </a>
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={removingBudgetId === f.id}
                    onClick={() => removeBudgetFile(f)}
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Receipt className="h-4 w-4" /> Orçamentos
          </h3>
          {canWrite && !showAddQuote && (
            <Button variant="outline" size="sm" onClick={() => setShowAddQuote(true)}>
              <Plus className="h-3.5 w-3.5" /> Nova cotação
            </Button>
          )}
        </div>
        {showAddQuote && (
          <Card className="mb-3 p-3">
            <div className="grid gap-2 sm:grid-cols-5">
              <Input
                value={newQuote.item_name}
                onChange={(e) => setNewQuote({ ...newQuote, item_name: e.target.value })}
                placeholder="Item cotado"
                className="sm:col-span-2"
                autoFocus
              />
              <select
                value={newQuote.unit}
                onChange={(e) => setNewQuote({ ...newQuote, unit: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <Input
                type="number"
                step="0.01"
                value={newQuote.unit_price}
                onChange={(e) => setNewQuote({ ...newQuote, unit_price: e.target.value })}
                placeholder="Preço"
              />
              <Input
                type="date"
                value={newQuote.quoted_at}
                onChange={(e) => setNewQuote({ ...newQuote, quoted_at: e.target.value })}
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddQuote(false)}>Cancelar</Button>
              <Button size="sm" disabled={savingNewQuote || !newQuote.item_name.trim() || !newQuote.unit_price} onClick={addNewQuote}>
                Salvar
              </Button>
            </div>
          </Card>
        )}
        {canWrite && quotes.length > 0 && (
          <p className="mb-2 text-[11px] text-text-muted">
            Clique em <Check className="inline h-3 w-3" /> pra aceitar e virar um custo, ou arraste pra baixo.
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
                        <Button variant="ghost" size="sm" className="mr-auto text-danger hover:text-danger" disabled={savingQuote} onClick={() => removeQuote(q.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Apagar
                        </Button>
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
            <ShoppingBag className="h-4 w-4" /> Custos
          </h3>
          <div className="flex items-center gap-2">
            {purchases.length > 0 && <Money value={purchaseTotal} size="sm" tone="muted" />}
            {canWrite && (
              <Button variant="outline" size="sm" onClick={() => setShowAddExpense(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar despesa
              </Button>
            )}
          </div>
        </div>
        {purchases.length === 0 ? (
          <Empty
            icon={ShoppingBag}
            title="Sem custos ainda"
            description={canWrite ? "Aceite uma cotação acima ou arraste ela pra cá." : "Custos aceitos aparecem aqui."}
          />
        ) : (
          <Card className="divide-y divide-border">
            {purchases.map((p) => {
              const total = Number(p.quantity) * Number(p.actual_unit_price ?? p.unit_price ?? 0);
              const isEditing = editingPurchaseId === p.id;
              const done = p.status === "done";
              return (
                <div key={p.id}>
                <div
                  className={`flex items-center justify-between gap-3 p-3 text-sm ${canWrite ? "hover:bg-bg-elev-2" : ""} ${done ? "opacity-60" : ""}`}
                >
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => toggleDone(p)}
                      aria-label={done ? "Marcar como a fazer" : "Marcar como feito"}
                      className="shrink-0 text-text-muted hover:text-success"
                    >
                      {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5" />}
                    </button>
                  ) : (
                    done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-text-muted" />
                  )}
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openPurchase(p)}>
                    <p className={`truncate font-medium ${done ? "line-through" : ""}`}>{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {Number(p.quantity)} {p.unit}
                      {done && p.bought_at && <> · feito em {fmtDate(p.bought_at, "dd/MM/yyyy")}</>}
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

      {showAddExpense && (
        <QuickAddExpenseDialog
          suppliers={[{ id: supplier.id, name: supplier.name }]}
          defaultSupplierId={supplier.id}
          allowNewSupplier={false}
          onDone={(r) => {
            setShowAddExpense(false);
            setQuotes((s) => [r.quote, ...s]);
            if (r.item) setPurchases((s) => [r.item!, ...s]);
          }}
          onCancel={() => setShowAddExpense(false)}
        />
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
