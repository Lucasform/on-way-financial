"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Bed,
  Calendar,
  Camera,
  Car,
  Check,
  Coffee,
  MapPin,
  Plus,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface TravelDay {
  id: string;
  module_id: string;
  day_number: number;
  date: string | null;
  city: string | null;
  country: string | null;
  accommodation: string | null;
  notes: string | null;
}

export interface TravelActivity {
  id: string;
  module_id: string;
  day_id: string | null;
  kind: string;
  name: string;
  start_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  planned_cost: number | null;
  actual_cost: number | null;
  currency: string | null;
  booking_ref: string | null;
  status: string;
  rating: number | null;
  position: number;
  notes: string | null;
}

const KIND_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sight: { label: "Passeio", icon: Camera, color: "#7C8CFF" },
  food: { label: "Refeição", icon: UtensilsCrossed, color: "#F59E0B" },
  transport: { label: "Transporte", icon: Car, color: "#3B82F6" },
  shopping: { label: "Compras", icon: ShoppingBag, color: "#EC4899" },
  show: { label: "Show", icon: Ticket, color: "#A855F7" },
  tour: { label: "Tour", icon: MapPin, color: "#22C55E" },
  rest: { label: "Descanso", icon: Bed, color: "#9CA3AF" },
  other: { label: "Outro", icon: Coffee, color: "#6B7280" },
};

interface Props {
  moduleId: string;
  initialDays: TravelDay[];
  initialActivities: TravelActivity[];
  canWrite: boolean;
}

export function TravelItineraryTab({ moduleId, initialDays, initialActivities, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [days, setDays] = useState(initialDays);
  const [activities, setActivities] = useState(initialActivities);
  const [pending, start] = useTransition();
  const [draftDay, setDraftDay] = useState<Partial<TravelDay>>({});
  const [activityFor, setActivityFor] = useState<string | null>(null);
  const [draftAct, setDraftAct] = useState<Partial<TravelActivity>>({ kind: "sight" });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, TravelActivity[]>();
    for (const a of activities) {
      const k = a.day_id ?? "loose";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    for (const list of map.values()) list.sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
    return map;
  }, [activities]);

  const totals = useMemo(() => {
    let planned = 0;
    let actual = 0;
    for (const a of activities) {
      planned += Number(a.planned_cost ?? 0);
      actual += Number(a.actual_cost ?? 0);
    }
    return { planned, actual, count: activities.length };
  }, [activities]);

  function addDay() {
    if (!canWrite) return;
    const next = (days.length > 0 ? Math.max(...days.map((d) => d.day_number)) : 0) + 1;
    start(async () => {
      const { data } = await supabase
        .from("travel_days")
        .insert({
          module_id: moduleId,
          day_number: next,
          date: draftDay.date ?? null,
          city: draftDay.city ?? null,
          country: draftDay.country ?? null,
          accommodation: draftDay.accommodation ?? null,
          notes: null,
        })
        .select("*")
        .single();
      if (data) setDays((s) => [...s, data as TravelDay]);
      setDraftDay({});
    });
  }

  function removeDay(id: string) {
    if (!canWrite || !confirm("Remover este dia e todas as atividades dele?")) return;
    start(async () => {
      await supabase.from("travel_days").delete().eq("id", id);
      setDays((s) => s.filter((d) => d.id !== id));
      setActivities((s) => s.filter((a) => a.day_id !== id));
    });
  }

  function addActivity(dayId: string | null) {
    if (!canWrite || !draftAct.name?.trim()) return;
    start(async () => {
      const { data } = await supabase
        .from("travel_activities")
        .insert({
          module_id: moduleId,
          day_id: dayId,
          kind: draftAct.kind ?? "sight",
          name: draftAct.name!.trim(),
          start_time: draftAct.start_time ?? null,
          location: draftAct.location ?? null,
          planned_cost: draftAct.planned_cost ?? null,
          currency: draftAct.currency ?? "BRL",
          status: "planned",
          notes: null,
          position: 0,
        })
        .select("*")
        .single();
      if (data) setActivities((s) => [...s, data as TravelActivity]);
      setDraftAct({ kind: "sight" });
      setActivityFor(null);
    });
  }

  function toggleStatus(id: string, status: "planned" | "done" | "cancelled") {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("travel_activities").update({ status }).eq("id", id);
      setActivities((s) => s.map((a) => (a.id === id ? { ...a, status } : a)));
    });
  }

  function removeActivity(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("travel_activities").delete().eq("id", id);
      setActivities((s) => s.filter((a) => a.id !== id));
    });
  }

  async function askAi() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/travel-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, prompt: aiPrompt }),
      });
      if (!res.ok) throw new Error("Falha na IA");
      const data = (await res.json()) as { activities: Partial<TravelActivity>[] };
      if (!data.activities?.length) {
        toast.warning("IA não conseguiu sugerir nada.");
        return;
      }
      const toInsert = data.activities.map((a) => ({
        module_id: moduleId,
        day_id: a.day_id ?? null,
        kind: a.kind ?? "sight",
        name: a.name ?? "Atividade",
        start_time: a.start_time ?? null,
        location: a.location ?? null,
        planned_cost: a.planned_cost ?? null,
        currency: a.currency ?? "BRL",
        status: "planned" as const,
        notes: a.notes ?? "Sugerido pela IA",
        position: 0,
      }));
      const { data: ins } = await supabase.from("travel_activities").insert(toInsert).select("*");
      if (ins) setActivities((s) => [...s, ...(ins as TravelActivity[])]);
      setAiOpen(false);
      setAiPrompt("");
      toast.success(`${toInsert.length} atividades adicionadas.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Dias" value={String(days.length)} />
        <Stat label="Planejado" value={<Money value={totals.planned} className="num" size="sm" />} />
        <Stat label="Realizado" value={<Money value={totals.actual} className="num" size="sm" tone="success" />} />
      </section>

      {canWrite && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={addDay} disabled={pending}>
            <Plus className="h-4 w-4" /> Novo dia
          </Button>
          <Input
            type="date"
            value={draftDay.date ?? ""}
            onChange={(e) => setDraftDay({ ...draftDay, date: e.target.value })}
            className="w-auto"
            placeholder="data"
          />
          <Input
            value={draftDay.city ?? ""}
            onChange={(e) => setDraftDay({ ...draftDay, city: e.target.value })}
            className="w-auto"
            placeholder="cidade"
          />
          <span className="flex-1" />
          <Button onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> Sugerir roteiro com IA
          </Button>
        </div>
      )}

      {aiOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setAiOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Sugerir roteiro com IA</h3>
            </div>
            <p className="text-sm text-text-muted">
              Diga destino, dias e estilo. A IA gera atividades por dia (passeios, restaurantes, transporte) com
              custo aproximado.
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-border bg-bg-elev-2 p-3 text-sm"
              placeholder={`Exemplos:
- "Lisboa 5 dias, estilo cultural, casal, médio orçamento"
- "Buenos Aires 3 dias com gastronomia e tango"
- "Cancún 7 dias com kids, all-inclusive + passeios"`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAiOpen(false)} disabled={aiLoading}>
                Cancelar
              </Button>
              <Button onClick={askAi} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? "Pensando..." : "Gerar"}
              </Button>
            </div>
          </div>
        </>
      )}

      {days.length === 0 && activities.length === 0 ? (
        <Empty
          icon={Calendar}
          title="Comece pelo roteiro"
          description="Adicione dias e atividades ou peça pra IA criar um roteiro inicial."
        />
      ) : (
        <ol className="space-y-3">
          {days
            .slice()
            .sort((a, b) => a.day_number - b.day_number)
            .map((day) => {
              const acts = grouped.get(day.id) ?? [];
              const dayTotal = acts.reduce((sum, a) => sum + Number(a.planned_cost ?? 0), 0);
              return (
                <li key={day.id}>
                  <Card className="overflow-hidden">
                    <header className="flex items-center justify-between gap-2 border-b border-border bg-bg-elev-2/40 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                          {day.day_number}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {day.city ?? "Cidade não definida"}
                            {day.country && <span className="text-text-muted"> · {day.country}</span>}
                          </p>
                          <p className="text-xs text-text-muted">
                            {day.date ? fmtDate(day.date, "EEEE, dd 'de' MMMM") : "sem data"}
                            {day.accommodation && ` · 🏨 ${day.accommodation}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Money value={dayTotal} size="sm" tone="muted" className="num" />
                        {canWrite && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setActivityFor(activityFor === day.id ? null : day.id)}
                            >
                              <Plus className="h-3.5 w-3.5" /> Atividade
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeDay(day.id)} aria-label="Remover">
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </>
                        )}
                      </div>
                    </header>

                    {activityFor === day.id && canWrite && (
                      <div className="border-b border-border bg-bg-elev-2/30 p-3">
                        <div className="grid gap-2 sm:grid-cols-5">
                          <select
                            value={draftAct.kind ?? "sight"}
                            onChange={(e) => setDraftAct({ ...draftAct, kind: e.target.value })}
                            className="h-9 rounded-md border border-border bg-bg-elev px-2 text-xs"
                          >
                            {Object.entries(KIND_META).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            placeholder="Nome"
                            value={draftAct.name ?? ""}
                            onChange={(e) => setDraftAct({ ...draftAct, name: e.target.value })}
                            className="sm:col-span-2 h-9"
                          />
                          <Input
                            type="time"
                            value={draftAct.start_time ?? ""}
                            onChange={(e) => setDraftAct({ ...draftAct, start_time: e.target.value })}
                            className="h-9"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="R$"
                            value={draftAct.planned_cost ?? ""}
                            onChange={(e) =>
                              setDraftAct({
                                ...draftAct,
                                planned_cost: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="h-9"
                          />
                          <Button
                            size="sm"
                            onClick={() => addActivity(day.id)}
                            className="sm:col-span-5"
                            disabled={!draftAct.name?.trim()}
                          >
                            Salvar atividade
                          </Button>
                        </div>
                      </div>
                    )}

                    {acts.length === 0 ? (
                      <p className="p-4 text-xs text-text-muted">Sem atividades neste dia.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {acts.map((a) => {
                          const meta = KIND_META[a.kind] ?? KIND_META.other;
                          const Icon = meta!.icon;
                          const isDone = a.status === "done";
                          const isCancelled = a.status === "cancelled";
                          return (
                            <li
                              key={a.id}
                              className={
                                "flex items-center gap-3 px-4 py-2.5 " +
                                (isCancelled ? "opacity-50 line-through" : "")
                              }
                            >
                              <span
                                className="flex h-8 w-8 items-center justify-center rounded-full"
                                style={{ background: `${meta!.color}1a`, color: meta!.color }}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{a.name}</p>
                                <p className="truncate text-xs text-text-muted">
                                  {a.start_time && <span>{a.start_time.slice(0, 5)} · </span>}
                                  {a.location ?? meta!.label}
                                </p>
                              </div>
                              <Money value={a.planned_cost} size="sm" tone="muted" className="num" />
                              {canWrite && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => toggleStatus(a.id, isDone ? "planned" : "done")}
                                    aria-label="Marcar feito"
                                  >
                                    <Check className={"h-4 w-4 " + (isDone ? "text-success" : "text-text-muted")} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeActivity(a.id)}
                                    aria-label="Remover"
                                  >
                                    <Trash2 className="h-4 w-4 text-danger" />
                                  </Button>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                </li>
              );
            })}

          {/* Atividades sem dia */}
          {(grouped.get("loose")?.length ?? 0) > 0 && (
            <li>
              <Card className="overflow-hidden">
                <header className="flex items-center justify-between border-b border-border bg-bg-elev-2/40 px-4 py-2.5 text-sm text-text-muted">
                  <span>Sem dia atribuído</span>
                  <Badge variant="warning">arraste pra um dia</Badge>
                </header>
                <ul className="divide-y divide-border">
                  {grouped.get("loose")!.map((a) => {
                    const meta = KIND_META[a.kind] ?? KIND_META.other;
                    const Icon = meta!.icon;
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ background: `${meta!.color}1a`, color: meta!.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex-1 text-sm">{a.name}</div>
                        <Money value={a.planned_cost} size="sm" tone="muted" className="num" />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </li>
          )}
        </ol>
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
