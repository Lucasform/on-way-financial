"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, CloudSun, Users, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

type Entry = {
  id: string;
  entry_date: string;
  note: string;
  weather: string | null;
  workers: number | null;
  photo_url: string | null;
};

const WEATHER = ["☀️ Sol", "⛅ Nublado", "🌧 Chuva", "⛈ Tempestade"];

export function DiarySection({
  householdId,
  moduleId,
  entries,
}: {
  householdId: string;
  moduleId: string;
  entries: Entry[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [weather, setWeather] = useState("");
  const [workers, setWorkers] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!note.trim()) return;
    setSaving(true);
    let photo_url: string | null = null;
    if (file) {
      const path = `${moduleId}/diary-${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("obra").upload(path, file);
      if (!error) photo_url = supabase.storage.from("obra").getPublicUrl(path).data.publicUrl;
    }
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("module_diary").insert({
      module_id: moduleId,
      household_id: householdId,
      entry_date: date,
      note,
      weather: weather || null,
      workers: workers ? parseInt(workers) : null,
      photo_url,
      created_by: auth.user?.id,
    });
    setSaving(false);
    setNote("");
    setWeather("");
    setWorkers("");
    setFile(null);
    router.refresh();
  }

  async function remove(id: string) {
    await supabase.from("module_diary").delete().eq("id", id);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Diário de obra</CardTitle>
      <p className="mt-1 text-xs text-muted">Registre o andamento do dia: o que foi feito, clima, equipe e fotos.</p>

      <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface-2 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select value={weather} onChange={(e) => setWeather(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40">
            <option value="">Clima</option>
            {WEATHER.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <Input inputMode="numeric" value={workers} onChange={(e) => setWorkers(e.target.value)} placeholder="Nº pessoas" />
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="O que foi feito hoje..."
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface-2">
            <Upload className="h-3.5 w-3.5" />
            {file ? file.name.slice(0, 18) : "Anexar foto"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button onClick={add} loading={saving} size="sm">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mt-4 space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="font-medium text-fg">{new Date(e.entry_date).toLocaleDateString("pt-BR")}</span>
                  {e.weather && <span className="flex items-center gap-1"><CloudSun className="h-3.5 w-3.5" />{e.weather}</span>}
                  {e.workers != null && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{e.workers}</span>}
                </div>
                <button onClick={() => remove(e.id)} className="shrink-0 text-fg-soft hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">{e.note}</p>
              {e.photo_url && (
                <a href={e.photo_url} target="_blank" className="mt-2 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.photo_url} alt="" className="h-40 w-full rounded-lg border border-border object-cover" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
