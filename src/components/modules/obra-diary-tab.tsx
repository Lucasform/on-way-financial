"use client";

import { useState, useTransition } from "react";
import { BookOpen, Camera, ChevronDown, ChevronUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, todayISO } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { sanitizeFilename } from "@/lib/utils";

export interface DiaryEntry {
  id: string;
  module_id: string;
  phase_id: string | null;
  entry_date: string;
  weather: string | null;
  body: string;
  workers_count: number | null;
  hours_worked: number | null;
  photo_urls: string[] | null;
}

interface Props {
  moduleId: string;
  householdId: string;
  initial: DiaryEntry[];
  phases: { id: string; name: string }[];
  canWrite: boolean;
}

export function ObraDiaryTab({ moduleId, householdId, initial, phases, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [entries, setEntries] = useState(initial);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DiaryEntry>>({ entry_date: todayISO() });
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPendingPhotos((s) => [...s, ...next]);
  }

  function removePendingPhoto(idx: number) {
    setPendingPhotos((s) => s.filter((_, i) => i !== idx));
  }

  async function add() {
    if (!canWrite || !draft.body?.trim()) return;
    setUploading(true);
    try {
      const photoUrls: string[] = [];
      for (const p of pendingPhotos) {
        const safe = sanitizeFilename(p.file.name);
        const path = `${householdId}/${moduleId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage
          .from("obra-gallery")
          .upload(path, p.file, { cacheControl: "3600", contentType: p.file.type || undefined });
        if (error) {
          toast.error(`Falha ao subir foto: ${error.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("obra-gallery").getPublicUrl(path);
        photoUrls.push(pub.publicUrl);
      }

      const { data, error } = await supabase
        .from("obra_diary")
        .insert({
          module_id: moduleId,
          phase_id: draft.phase_id ?? null,
          entry_date: draft.entry_date ?? todayISO(),
          weather: draft.weather ?? null,
          body: draft.body!.trim(),
          workers_count: draft.workers_count ?? null,
          hours_worked: draft.hours_worked ?? null,
          photo_urls: photoUrls,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao salvar.");
        return;
      }
      setEntries((s) => [data as DiaryEntry, ...s]);
      setDraft({ entry_date: todayISO() });
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPendingPhotos([]);
      setMoreOpen(false);
      toast.success("Andamento registrado.");
    } finally {
      setUploading(false);
    }
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
          <p className="mb-3 text-sm font-semibold">O que foi feito?</p>
          <Textarea
            value={draft.body ?? ""}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder='Ex: "Terminamos o chapisco da sala. Comprei mais 20 sacos de cimento na Leroy."'
            rows={3}
            autoFocus
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Label htmlFor="dphotos" className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-xs font-medium hover:bg-bg-elev-2">
                <Camera className="h-3.5 w-3.5" /> Adicionar fotos
              </span>
            </Label>
            <Input
              id="dphotos"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addPhotos(e.target.files)}
            />
            <button
              type="button"
              onClick={() => setMoreOpen((s) => !s)}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
            >
              {moreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Mais detalhes (fase, data, equipe)
            </button>
          </div>

          {pendingPhotos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingPhotos.map((p, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePendingPhoto(i)}
                    aria-label="Remover foto"
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {moreOpen && (
            <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-4">
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
                <Label htmlFor="dphase">Fase</Label>
                <select
                  id="dphase"
                  value={draft.phase_id ?? ""}
                  onChange={(e) => setDraft({ ...draft, phase_id: e.target.value || null })}
                  className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
                >
                  <option value="">—</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dwc">Pessoas na obra</Label>
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
                <Label htmlFor="dhw">Horas trabalhadas</Label>
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
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <Button onClick={add} disabled={uploading || pending || !draft.body?.trim()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Registrar
            </Button>
          </div>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty
          icon={BookOpen}
          title="Nada registrado ainda"
          description="Registre o andamento com uma foto. O progresso merece ficar documentado 🧱"
        />
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-6">
          {entries.map((e) => {
            const phase = phases.find((p) => p.id === e.phase_id);
            const photos = e.photo_urls ?? [];
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-primary/15 text-[10px]">
                  🧱
                </span>
                <Card className="p-4">
                  <header className="mb-2 flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
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
                  {photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {photos.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-square overflow-hidden rounded-md border border-border bg-bg-elev-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
                        </a>
                      ))}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
