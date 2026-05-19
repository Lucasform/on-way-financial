"use client";

import { useState, useTransition } from "react";
import { BookOpen, CloudRain, Cloud, Plus, Sun, Trash2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, todayISO } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface DiaryEntry {
  id: string;
  module_id: string;
  phase_id: string | null;
  entry_date: string;
  weather: string | null;
  body: string;
  workers_count: number | null;
  hours_worked: number | null;
}

const WEATHER_ICON: Record<string, React.ReactNode> = {
  sunny: <Sun className="h-3.5 w-3.5 text-warning" />,
  cloudy: <Cloud className="h-3.5 w-3.5 text-text-muted" />,
  rain: <CloudRain className="h-3.5 w-3.5 text-accent" />,
  storm: <Zap className="h-3.5 w-3.5 text-danger" />,
};

interface Props {
  moduleId: string;
  initial: DiaryEntry[];
  phases: { id: string; name: string }[];
  canWrite: boolean;
}

export function ObraDiaryTab({ moduleId, initial, phases, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [entries, setEntries] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<DiaryEntry>>({
    entry_date: todayISO(),
    weather: "sunny",
  });

  function add() {
    if (!canWrite || !draft.body?.trim()) return;
    start(async () => {
      const { data } = await supabase
        .from("obra_diary")
        .insert({
          module_id: moduleId,
          phase_id: draft.phase_id ?? null,
          entry_date: draft.entry_date ?? todayISO(),
          weather: draft.weather ?? null,
          body: draft.body!.trim(),
          workers_count: draft.workers_count ?? null,
          hours_worked: draft.hours_worked ?? null,
        })
        .select("*")
        .single();
      if (!data) return;
      setEntries((s) => [data as DiaryEntry, ...s]);
      setDraft({ entry_date: todayISO(), weather: "sunny" });
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("obra_diary").delete().eq("id", id);
      setEntries((s) => s.filter((e) => e.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Registrar dia</p>
          <div className="grid gap-2 sm:grid-cols-6">
            <div className="space-y-1">
              <Label htmlFor="ddate">Data</Label>
              <Input
                id="ddate"
                type="date"
                value={draft.entry_date}
                onChange={(e) => setDraft({ ...draft, entry_date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dweather">Clima</Label>
              <select
                id="dweather"
                value={draft.weather ?? "sunny"}
                onChange={(e) => setDraft({ ...draft, weather: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                <option value="sunny">☀️ Ensolarado</option>
                <option value="cloudy">☁️ Nublado</option>
                <option value="rain">🌧️ Chuva</option>
                <option value="storm">⛈️ Tempestade</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dphase">Fase</Label>
              <select
                id="dphase"
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
              <Label htmlFor="dwc">Pessoas</Label>
              <Input
                id="dwc"
                type="number"
                min={0}
                value={draft.workers_count ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, workers_count: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dhw">Horas</Label>
              <Input
                id="dhw"
                type="number"
                step="0.5"
                min={0}
                value={draft.hours_worked ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, hours_worked: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </div>
            <div className="sm:col-span-6 space-y-1">
              <Label htmlFor="dbody">Como foi o dia?</Label>
              <Textarea
                id="dbody"
                value={draft.body ?? ""}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder='Ex: "Hoje terminamos o chapisco da sala. Pedro chegou atrasado por causa da chuva. Comprei mais 20 sacos de cimento na Leroy."'
                rows={3}
              />
            </div>
            <div className="sm:col-span-6 flex justify-end">
              <Button onClick={add} disabled={pending || !draft.body?.trim()}>
                <Plus className="h-4 w-4" /> Salvar entrada
              </Button>
            </div>
          </div>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty
          icon={BookOpen}
          title="Diário vazio"
          description="Comece a registrar cada dia da obra. O sonho merece ser documentado 📔"
        />
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-6">
          {entries.map((e) => {
            const phase = phases.find((p) => p.id === e.phase_id);
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg-elev">
                  {(e.weather && WEATHER_ICON[e.weather]) ?? <Sun className="h-3 w-3 text-text-muted" />}
                </span>
                <Card className="p-4">
                  <header className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="font-semibold text-text">{fmtDate(e.entry_date, "EEEE, dd 'de' MMMM")}</span>
                      {phase && <span>· {phase.name}</span>}
                      {e.workers_count != null && (
                        <span>· {e.workers_count} {e.workers_count === 1 ? "pessoa" : "pessoas"}</span>
                      )}
                      {e.hours_worked != null && <span>· {Number(e.hours_worked)}h</span>}
                    </div>
                    {canWrite && (
                      <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label="Remover">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    )}
                  </header>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{e.body}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
