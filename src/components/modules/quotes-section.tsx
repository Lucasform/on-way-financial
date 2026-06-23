"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus, Trash2, Check, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

type Supplier = { id: string; name: string };
type Quote = {
  id: string;
  item: string;
  amount: number | null;
  unit: string | null;
  ai_min: number | null;
  ai_avg: number | null;
  ai_max: number | null;
  source: string;
  chosen: boolean;
  supplier_id: string | null;
};

export function QuotesSection({
  householdId,
  moduleId,
  quotes,
  suppliers,
}: {
  householdId: string;
  moduleId: string;
  quotes: Quote[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(false);
  const [est, setEst] = useState<{ min: number; avg: number; max: number; unit: string; notes: string } | null>(null);

  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name;
  const min = Math.min(...quotes.map((q) => Number(q.amount ?? q.ai_avg ?? Infinity)));

  async function estimate() {
    if (!item.trim()) return;
    setLoading(true);
    setEst(null);
    const res = await fetch("/api/ai/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setEst(data.estimate);
      if (!amount) setAmount(String(data.estimate.avg));
    }
  }

  async function save(useAi: boolean) {
    if (!item.trim()) return;
    await supabase.from("module_quotes").insert({
      household_id: householdId,
      module_id: moduleId,
      supplier_id: supplierId || null,
      item,
      amount: amount ? parseFloat(amount.replace(",", ".")) : est?.avg ?? null,
      unit: est?.unit ?? null,
      ai_min: est?.min ?? null,
      ai_avg: est?.avg ?? null,
      ai_max: est?.max ?? null,
      source: useAi && est ? "ai" : "manual",
    });
    setItem("");
    setAmount("");
    setSupplierId("");
    setEst(null);
    router.refresh();
  }

  async function choose(q: Quote) {
    await supabase.from("module_quotes").update({ chosen: !q.chosen }).eq("id", q.id);
    router.refresh();
  }
  async function remove(id: string) {
    await supabase.from("module_quotes").delete().eq("id", id);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Cotações (IA)</CardTitle>
      <p className="mt-1 text-xs text-muted">
        Estime preço de mercado com IA, compare fornecedores e escolha a melhor.
      </p>

      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="ex: cimento CP-II 50kg" onKeyDown={(e) => e.key === "Enter" && estimate()} />
          <Button onClick={estimate} loading={loading} variant="outline" className="shrink-0">
            <Sparkles className="h-4 w-4" /> Estimar
          </Button>
        </div>

        {est && (
          <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-muted">Mín <b className="num text-fg">{brl(est.min)}</b></span>
              <span className="text-muted">Médio <b className="num text-brand">{brl(est.avg)}</b></span>
              <span className="text-muted">Máx <b className="num text-fg">{brl(est.max)}</b></span>
              <span className="text-xs text-muted">/ {est.unit}</span>
            </div>
            <p className="mt-1 text-xs text-fg-soft">{est.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor cotado R$" />
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="sm:col-span-1">
            <option value="">Fornecedor (opcional)</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Button onClick={() => save(Boolean(est))} variant="outline">
            <Plus className="h-4 w-4" /> Salvar cotação
          </Button>
        </div>
      </div>

      {quotes.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {quotes.map((q) => {
            const val = Number(q.amount ?? q.ai_avg ?? 0);
            const isMin = val === min && val > 0;
            return (
              <li key={q.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <button onClick={() => choose(q)} className={`grid h-6 w-6 place-items-center rounded-md border ${q.chosen ? "border-success bg-success/15 text-success" : "border-border text-transparent"}`}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div>
                    <span className="font-medium">{q.item}</span>
                    {q.supplier_id && <span className="ml-2 text-xs text-muted">{supplierName(q.supplier_id)}</span>}
                    {q.source === "ai" && <span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] text-brand">IA</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMin && <Star className="h-3.5 w-3.5 fill-success text-success" />}
                  <span className={`num font-semibold ${isMin ? "text-success" : ""}`}>{brl(val)}</span>
                  <button onClick={() => remove(q.id)} className="text-fg-soft hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
