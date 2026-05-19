"use client";

import { useMemo, useState, useTransition } from "react";
import { Boxes, Check, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Empty } from "@/components/ui/empty";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface ObraItem {
  id: string;
  module_id: string;
  phase_id: string | null;
  category: string;
  name: string;
  brand: string | null;
  supplier: string | null;
  unit: string;
  quantity: number;
  unit_price: number | null;
  actual_unit_price: number | null;
  status: string;
  bought_at: string | null;
  notes: string | null;
}

export interface PhaseRef {
  id: string;
  name: string;
}

const CATEGORIES = ["material", "mão-de-obra", "equipamento", "serviço"];
const UNITS = ["un", "m", "m2", "m3", "kg", "saco", "litro", "rolo", "barra", "caixa", "hora", "diária"];
const STATUSES: { value: string; label: string; tone: "default" | "secondary" | "success" | "warning" }[] = [
  { value: "planned", label: "Planejado", tone: "secondary" },
  { value: "ordered", label: "Encomendado", tone: "warning" },
  { value: "bought", label: "Comprado", tone: "success" },
  { value: "installed", label: "Instalado", tone: "success" },
  { value: "cancelled", label: "Cancelado", tone: "default" },
];

interface Props {
  moduleId: string;
  initial: ObraItem[];
  phases: PhaseRef[];
  canWrite: boolean;
}

export function ObraItemsTab({ moduleId, initial, phases, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<ObraItem>>({
    category: "material",
    unit: "un",
    quantity: 1,
    status: "planned",
  });
  const [filterPhase, setFilterPhase] = useState<string>("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = useMemo(
    () => (filterPhase ? items.filter((i) => i.phase_id === filterPhase) : items),
    [items, filterPhase],
  );

  const totals = useMemo(() => {
    let planned = 0;
    let actual = 0;
    for (const i of filtered) {
      const qty = Number(i.quantity);
      if (i.unit_price) planned += qty * Number(i.unit_price);
      if (i.status === "bought" || i.status === "installed") {
        actual += qty * Number(i.actual_unit_price ?? i.unit_price ?? 0);
      }
    }
    return { planned, actual, count: filtered.length };
  }, [filtered]);

  function add() {
    if (!canWrite || !draft.name?.trim()) return;
    start(async () => {
      const { data, error } = await supabase
        .from("obra_items")
        .insert({
          module_id: moduleId,
          phase_id: draft.phase_id ?? null,
          category: draft.category ?? "material",
          name: draft.name!.trim(),
          brand: draft.brand ?? null,
          supplier: draft.supplier ?? null,
          unit: draft.unit ?? "un",
          quantity: Number(draft.quantity ?? 1),
          unit_price: draft.unit_price ?? null,
          actual_unit_price: null,
          status: "planned",
          notes: null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao adicionar.");
        return;
      }
      setItems((s) => [data as ObraItem, ...s]);
      setDraft({ category: "material", unit: "un", quantity: 1, status: "planned" });
    });
  }

  function updateItem(id: string, patch: Partial<ObraItem>) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("obra_items").update(patch).eq("id", id);
      setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("obra_items").delete().eq("id", id);
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  async function askAi() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/obra-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, prompt: aiPrompt }),
      });
      if (!res.ok) throw new Error("Falha na IA");
      const data = (await res.json()) as { items: Partial<ObraItem>[] };
      if (!data.items?.length) {
        toast.warning("IA não conseguiu sugerir itens.");
        return;
      }
      // Insere todos os itens sugeridos
      const toInsert = data.items.map((it) => ({
        module_id: moduleId,
        phase_id: it.phase_id ?? null,
        category: it.category ?? "material",
        name: it.name ?? "Item",
        brand: it.brand ?? null,
        supplier: it.supplier ?? null,
        unit: it.unit ?? "un",
        quantity: Number(it.quantity ?? 1),
        unit_price: it.unit_price ?? null,
        status: "planned" as const,
        notes: it.notes ?? "Sugerido pela IA",
      }));
      const { data: inserted, error } = await supabase.from("obra_items").insert(toInsert).select("*");
      if (error || !inserted) {
        toast.error("Falha ao salvar sugestões.");
        return;
      }
      setItems((s) => [...(inserted as ObraItem[]), ...s]);
      setAiOpen(false);
      setAiPrompt("");
      toast.success(`${inserted.length} itens sugeridos adicionados.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Itens" value={String(totals.count)} />
        <Stat label="Planejado" value={<Money value={totals.planned} className="num" size="sm" />} />
        <Stat label="Realizado" value={<Money value={totals.actual} className="num" size="sm" tone="success" />} />
      </section>

      {/* Phase filter + AI button */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterPhase}
          onChange={(e) => setFilterPhase(e.target.value)}
          className="h-9 rounded-md border border-border bg-bg-elev px-3 text-sm"
        >
          <option value="">Todas as fases</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="flex-1" />
        {canWrite && (
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> Sugerir com IA
          </Button>
        )}
      </div>

      {/* Add form */}
      {canWrite && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Novo item</p>
          <div className="grid gap-2 sm:grid-cols-6">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="iname">Item</Label>
              <Input
                id="iname"
                value={draft.name ?? ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder='Ex: "Cimento CP-II 50kg"'
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="icat">Tipo</Label>
              <select
                id="icat"
                value={draft.category ?? "material"}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="iphase">Fase</Label>
              <select
                id="iphase"
                value={draft.phase_id ?? ""}
                onChange={(e) => setDraft({ ...draft, phase_id: e.target.value || null })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                <option value="">—</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="iqty">Qtd</Label>
              <Input
                id="iqty"
                type="number"
                step="0.01"
                value={draft.quantity ?? 1}
                onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iunit">Unidade</Label>
              <select
                id="iunit"
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
              <Label htmlFor="iprice">Preço unitário</Label>
              <Input
                id="iprice"
                type="number"
                step="0.01"
                value={draft.unit_price ?? ""}
                onChange={(e) => setDraft({ ...draft, unit_price: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="ibrand">Marca / fornecedor</Label>
              <div className="flex gap-1">
                <Input
                  id="ibrand"
                  placeholder="Marca"
                  value={draft.brand ?? ""}
                  onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                />
                <Input
                  placeholder="Fornecedor"
                  value={draft.supplier ?? ""}
                  onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button onClick={add} disabled={pending || !draft.name?.trim()} className="w-full">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* AI Suggest modal */}
      {aiOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setAiOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Sugerir materiais com IA</h3>
            </div>
            <p className="text-sm text-text-muted">
              Descreva o que precisa estimar e a IA cria a lista (ferro, cimento, gesso, tinta, etc.) com quantidade
              e preço aproximado.
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-border bg-bg-elev-2 p-3 text-sm"
              placeholder={`Exemplos:
- "Materiais pra rebocar 80m² de parede"
- "Estimar piso porcelanato 25m² + rejunte"
- "Materiais elétricos pra cozinha (5 tomadas, 3 pontos de luz)"`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAiOpen(false)} disabled={aiLoading}>
                Cancelar
              </Button>
              <Button onClick={askAi} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? "Pensando..." : "Sugerir"}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Items table */}
      {filtered.length === 0 ? (
        <Empty
          icon={Boxes}
          title="Sem itens"
          description={canWrite ? "Adicione manualmente acima ou peça pra IA sugerir." : ""}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-bg-elev-2 text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Fase</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right">Preço un.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {canWrite && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((i) => {
                  const phase = phases.find((p) => p.id === i.phase_id);
                  const total = Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0);
                  const statusMeta = STATUSES.find((s) => s.value === i.status);
                  return (
                    <tr key={i.id} className="hover:bg-bg-elev-2/50">
                      <td className="px-3 py-2 align-middle">
                        <p className="font-medium">{i.name}</p>
                        <p className="text-[10px] text-text-muted">
                          {i.category}
                          {i.brand && ` · ${i.brand}`}
                          {i.supplier && ` · ${i.supplier}`}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-text-muted">
                        {phase?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right align-middle">
                        <span className="num">
                          {Number(i.quantity)} {i.unit}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right align-middle">
                        <Money value={i.unit_price} size="sm" tone="muted" className="num" />
                      </td>
                      <td className="px-3 py-2 text-right align-middle">
                        <Money value={total} size="sm" className="num font-medium" />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {canWrite ? (
                          <select
                            value={i.status}
                            onChange={(e) => updateItem(i.id, { status: e.target.value })}
                            className="h-7 rounded-md border border-border bg-bg-elev px-2 text-xs"
                          >
                            {STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={statusMeta?.tone ?? "default"}>{statusMeta?.label}</Badge>
                        )}
                      </td>
                      {canWrite && (
                        <td className="px-3 py-2 text-right align-middle">
                          <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}
