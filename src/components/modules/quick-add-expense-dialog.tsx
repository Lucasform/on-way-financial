"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SupplierOption {
  id: string;
  name: string;
}

const NEW_SUPPLIER = "__new__";
const SUPPLIER_CATEGORIES = ["material", "mão-de-obra", "equipamento", "serviço", "outro"];

export interface QuickAddResult {
  supplier: SupplierOption;
  quote: { id: string; item_name: string; unit: string; unit_price: number; quoted_at: string; accepted_at: string | null };
  item: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unit_price: number | null;
    actual_unit_price: number | null;
    status: string;
    bought_at: string | null;
  } | null;
}

interface Props {
  suppliers: SupplierOption[];
  defaultSupplierId?: string;
  allowNewSupplier?: boolean;
  onDone: (result: QuickAddResult) => void;
  onCancel: () => void;
}

export function QuickAddExpenseDialog({ suppliers, defaultSupplierId, allowNewSupplier = true, onDone, onCancel }: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [supplierId, setSupplierId] = useState(
    defaultSupplierId ?? (suppliers.length === 0 && allowNewSupplier ? NEW_SUPPLIER : ""),
  );
  const [options, setOptions] = useState(suppliers);
  const [newSupplier, setNewSupplier] = useState({ name: "", category: "material", phone: "" });
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [status, setStatus] = useState<"cotacao" | "executada">("executada");
  const [saving, setSaving] = useState(false);

  const creatingSupplier = supplierId === NEW_SUPPLIER;
  const num = Number(amount.replace(",", "."));
  const valid = name.trim().length > 0 && Number.isFinite(num) && num > 0 && supplierId.length > 0 && !creatingSupplier;

  async function saveSupplier() {
    if (!newSupplier.name.trim() || savingSupplier) return;
    setSavingSupplier(true);
    try {
      const res = await fetch("/api/obra/suppliers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newSupplier.name.trim(),
          category: newSupplier.category,
          ...(newSupplier.phone.trim() ? { phone: newSupplier.phone.trim() } : {}),
        }),
      });
      if (!res.ok) {
        toast.error("Falha ao cadastrar fornecedor.");
        return;
      }
      const data = (await res.json()) as { supplier: SupplierOption; created: boolean };
      setOptions((s) =>
        s.some((x) => x.id === data.supplier.id) ? s : [...s, data.supplier].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSupplierId(data.supplier.id);
      setNewSupplier({ name: "", category: "material", phone: "" });
      toast.success(data.created ? "Fornecedor cadastrado." : "Esse fornecedor já existia, selecionei ele.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/obra/quick-add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: num,
          supplier_id: supplierId,
          status,
        }),
      });
      if (!res.ok) {
        toast.error("Falha ao registrar.");
        return;
      }
      toast.success(status === "executada" ? "Custo registrado." : "Cotação registrada.");
      onDone((await res.json()) as QuickAddResult);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-bg-elev p-5 shadow-2xl">
        <p className="mb-3 text-sm font-semibold">Adicionar despesa</p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="qa-name">O que foi</Label>
            <Input
              id="qa-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cimento, pedreiro..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qa-amount">Valor</Label>
            <Input
              id="qa-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valid) submit();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qa-supplier">Fornecedor</Label>
            <select
              id="qa-supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="">Selecione...</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {allowNewSupplier && <option value={NEW_SUPPLIER}>+ Cadastrar novo fornecedor</option>}
            </select>
            {creatingSupplier && (
              <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-primary">Novo fornecedor</p>
                <Input
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="Nome (ex: Depósito São José)"
                  aria-label="Nome do novo fornecedor"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newSupplier.category}
                    onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value })}
                    className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
                    aria-label="Tipo do fornecedor"
                  >
                    {SUPPLIER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="Telefone (opcional)"
                    inputMode="tel"
                    aria-label="Telefone do novo fornecedor"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSupplierId("")}>
                    Cancelar
                  </Button>
                  <Button size="sm" disabled={!newSupplier.name.trim() || savingSupplier} onClick={saveSupplier}>
                    {savingSupplier && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Salvar fornecedor
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Situação</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("cotacao")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  status === "cotacao"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-muted hover:bg-bg-elev-2"
                }`}
              >
                Cotação
              </button>
              <button
                type="button"
                onClick={() => setStatus("executada")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  status === "executada"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-muted hover:bg-bg-elev-2"
                }`}
              >
                Executada
              </button>
            </div>
            <p className="text-[11px] text-text-muted">
              {status === "executada"
                ? "Já foi gasto: entra direto como custo feito no fornecedor."
                : "Só um preço cotado, ainda não gasto."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" disabled={!valid || saving} onClick={submit}>Adicionar</Button>
        </div>
      </div>
    </>
  );
}
