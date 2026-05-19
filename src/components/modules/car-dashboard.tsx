"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Calculator, Car, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface TcoYear {
  year: number;
  fuel: number;
  ipva: number;
  insurance: number;
  maintenance: number;
  depreciation: number;
  total: number;
}
interface TcoResult {
  summary: string;
  years: TcoYear[];
  total_5y?: number;
}

interface Module { id: string; name: string; status: string; budget: number | null }
interface Option {
  id: string;
  model: string;
  year: number | null;
  price: number;
  down_payment: number | null;
  installments: number | null;
  interest_rate: number | null;
  pros: string | null;
  cons: string | null;
}

export function CarDashboard({ module, options: initial, savings, canWrite }: { module: Module; options: Option[]; savings: number; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [options, setOptions] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Option>>({ model: "", price: 0 });

  function add() {
    if (!canWrite || !draft.model || !draft.price) return;
    start(async () => {
      const { data } = await supabase
        .from("car_options")
        .insert({
          module_id: module.id,
          model: draft.model!,
          year: draft.year ?? null,
          price: draft.price!,
          down_payment: draft.down_payment ?? null,
          installments: draft.installments ?? null,
          interest_rate: draft.interest_rate ?? null,
          pros: draft.pros ?? null,
          cons: draft.cons ?? null,
        })
        .select("*")
        .single();
      if (data) setOptions((s) => [...s, data as Option]);
      setDraft({ model: "", price: 0 });
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("car_options").delete().eq("id", id);
      setOptions((s) => s.filter((o) => o.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/modules" className="text-xs text-text-muted hover:text-text">← Módulos</Link>
        <h1 className="text-2xl font-semibold">🚗 {module.name}</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Já poupei</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={savings} size="xl" tone="success" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Meta</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={module.budget} size="xl" tone="muted" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Modelos comparados</CardTitle></CardHeader>
          <CardContent className="pt-0 font-mono text-2xl">{options.length}</CardContent>
        </Card>
      </section>

      {canWrite && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Adicionar modelo</h3>
          <div className="grid gap-2 sm:grid-cols-6">
            <Input placeholder="Modelo" value={draft.model ?? ""} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
            <Input type="number" placeholder="Ano" value={draft.year ?? ""} onChange={(e) => setDraft({ ...draft, year: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input type="number" step="0.01" placeholder="Preço" value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
            <Input type="number" step="0.01" placeholder="Entrada" value={draft.down_payment ?? ""} onChange={(e) => setDraft({ ...draft, down_payment: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input type="number" placeholder="Parcelas" value={draft.installments ?? ""} onChange={(e) => setDraft({ ...draft, installments: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input type="number" step="0.001" placeholder="Juros a.m. (%)" value={draft.interest_rate ?? ""} onChange={(e) => setDraft({ ...draft, interest_rate: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input className="sm:col-span-3" placeholder="Prós" value={draft.pros ?? ""} onChange={(e) => setDraft({ ...draft, pros: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Contras" value={draft.cons ?? ""} onChange={(e) => setDraft({ ...draft, cons: e.target.value })} />
            <Button onClick={add} disabled={pending || !draft.model}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </Card>
      )}

      {options.length === 0 ? (
        <Empty icon={Car} title="Sem modelos ainda" description="Adicione um carro para comparar." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <CarOptionCard key={o.id} option={o} canWrite={canWrite} onRemove={() => remove(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CarOptionCard({
  option: o,
  canWrite,
  onRemove,
}: {
  option: Option;
  canWrite: boolean;
  onRemove: () => void;
}) {
  const [tco, setTco] = useState<TcoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const sim = simulate(o);

  async function analyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/car-tco", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: o.model,
          year: o.year,
          price: Number(o.price),
          km_per_year: 15000,
          years: 5,
        }),
      });
      if (!res.ok) throw new Error("Falha na IA");
      const data = (await res.json()) as TcoResult;
      setTco(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  const total5y = tco?.total_5y ?? tco?.years.reduce((s, y) => s + y.total, 0) ?? 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">
            {o.model} {o.year && <span className="text-text-muted">· {o.year}</span>}
          </p>
          <Money value={o.price} size="lg" />
        </div>
        {canWrite && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <p className="text-text-muted">
          Entrada: <Money value={o.down_payment} size="sm" />
        </p>
        <p className="text-text-muted">Parcelas: {o.installments ?? "—"}</p>
        {sim && (
          <>
            <p className="text-text-muted">
              Parcela: <Money value={sim.installment} size="sm" />
            </p>
            <p className="text-text-muted">
              Custo financ.: <Money value={sim.totalCost} size="sm" tone="danger" />
            </p>
          </>
        )}
      </div>
      {(o.pros || o.cons) && (
        <div className="mt-3 grid gap-2 text-xs">
          {o.pros && <p>✅ {o.pros}</p>}
          {o.cons && <p>⚠️ {o.cons}</p>}
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3">
        {!tco ? (
          <Button variant="outline" size="sm" onClick={analyze} disabled={loading} className="w-full">
            <Sparkles className="h-4 w-4" />
            {loading ? "Analisando..." : "Análise 5 anos com IA"}
          </Button>
        ) : (
          <div className="space-y-2 text-xs">
            <p className="text-text-muted">{tco.summary}</p>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Custo total 5 anos (TCO):</span>
              <Money value={total5y} size="sm" tone="danger" className="num" />
            </div>
            <details className="text-text-muted">
              <summary className="cursor-pointer">Detalhe ano a ano</summary>
              <table className="mt-2 w-full text-[10px]">
                <thead className="text-text-muted">
                  <tr>
                    <th className="text-left">Ano</th>
                    <th className="text-right">Combust.</th>
                    <th className="text-right">IPVA</th>
                    <th className="text-right">Seguro</th>
                    <th className="text-right">Manut.</th>
                    <th className="text-right">Deprec.</th>
                    <th className="text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tco.years.map((y) => (
                    <tr key={y.year} className="border-t border-border">
                      <td>{y.year}</td>
                      <td className="text-right num">{y.fuel.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td className="text-right num">{y.ipva.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td className="text-right num">{y.insurance.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td className="text-right num">{y.maintenance.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td className="text-right num">{y.depreciation.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td className="text-right num font-semibold text-text">{y.total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <Button variant="ghost" size="sm" onClick={() => setTco(null)} className="text-[10px]">
              Refazer análise
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function simulate(o: Option): { installment: number; totalCost: number } | null {
  if (!o.installments || !o.interest_rate) return null;
  const principal = Number(o.price) - Number(o.down_payment ?? 0);
  const i = Number(o.interest_rate) / 100;
  const n = o.installments;
  const installment = i > 0 ? (principal * i) / (1 - Math.pow(1 + i, -n)) : principal / n;
  const totalCost = installment * n + Number(o.down_payment ?? 0);
  return { installment, totalCost };
}
