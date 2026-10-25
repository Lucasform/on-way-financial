"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SupplierOption {
  id: string;
  name: string;
}

interface Props {
  suppliers: SupplierOption[];
  onDone: () => void;
  onCancel: () => void;
}

export function QuickAddExpenseDialog({ suppliers, onDone, onCancel }: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState<"cotacao" | "executada">("executada");
  const [saving, setSaving] = useState(false);

  const num = Number(amount.replace(",", "."));
  const valid = name.trim().length > 0 && Number.isFinite(num) && num > 0 && supplierId.length > 0;

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
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elev p-5 shadow-2xl">
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
            {suppliers.length > 0 ? (
              <select
                id="qa-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                <option value="">Selecione...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-text-muted">Cadastre um fornecedor primeiro pra registrar despesas.</p>
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
