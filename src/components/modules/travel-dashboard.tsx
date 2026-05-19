"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Briefcase, Calendar, Camera, Plane, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty } from "@/components/ui/empty";
import {
  TravelChecklistTab,
  type TravelCheckItem,
} from "@/components/modules/travel-checklist-tab";
import {
  TravelItineraryTab,
  type TravelActivity,
  type TravelDay,
} from "@/components/modules/travel-itinerary-tab";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate, fmtRelative } from "@/lib/dates";
import { percent } from "@/lib/money";
import { sanitizeFilename } from "@/lib/utils";

interface Module {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}
interface Item {
  id: string;
  module_id: string;
  kind: string;
  title: string;
  planned_amount: number | null;
  actual_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  booking_ref: string | null;
}
interface Tx {
  id: string;
  amount: number | string;
  description: string | null;
  occurred_at: string;
}
interface GalleryItem {
  id: string;
  url: string;
  media_type: string;
  caption: string | null;
  taken_at: string;
}

const KINDS = [
  { key: "flight", label: "✈️ Voo" },
  { key: "hotel", label: "🏨 Hotel" },
  { key: "transport", label: "🚗 Transporte" },
  { key: "food", label: "🍽️ Alimentação" },
  { key: "tour", label: "🎡 Tour" },
  { key: "other", label: "📌 Outro" },
];

interface Props {
  module: Module;
  items: Item[];
  transactions: Tx[];
  days: TravelDay[];
  activities: TravelActivity[];
  checklist: TravelCheckItem[];
  gallery: GalleryItem[];
  householdId: string;
  canWrite: boolean;
}

export function TravelDashboard({
  module,
  items: initial,
  transactions,
  days,
  activities,
  checklist,
  gallery,
  householdId,
  canWrite,
}: Props) {
  const totalSpent = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const plannedActivities = activities.reduce((s, a) => s + Number(a.planned_cost ?? 0), 0);
  const plannedTotal = initial.reduce((s, i) => s + Number(i.planned_amount ?? 0), 0) + plannedActivities;
  const pct = module.budget ? percent(totalSpent, Number(module.budget)) : 0;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/modules" className="text-xs text-text-muted hover:text-text">
          ← Módulos
        </Link>
        <h1 className="text-2xl font-semibold sm:text-3xl">✈️ {module.name}</h1>
        {module.start_date && (
          <p className="text-sm text-text-muted">
            {fmtDate(module.start_date)} → {module.end_date ? fmtDate(module.end_date) : "—"}
          </p>
        )}
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Realizado" value={<Money value={totalSpent} size="xl" />} />
        <Stat label="Planejado" value={<Money value={plannedTotal} size="xl" tone="muted" />} />
        <Stat label="Orçamento" value={<Money value={module.budget} size="xl" tone="muted" />} />
        <Stat
          label="% usado"
          value={
            <div className="space-y-2">
              <p className="num text-2xl font-medium">{pct.toFixed(1)}%</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-elev-2">
                <div
                  className={
                    "h-full transition-all " +
                    (pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary")
                  }
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          }
        />
      </section>

      <Tabs defaultValue="itinerary">
        <TabsList>
          <TabsTrigger value="itinerary">Itinerário</TabsTrigger>
          <TabsTrigger value="reservations">Reservas</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="gallery">Galeria</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>

        <TabsContent value="itinerary">
          <TravelItineraryTab
            moduleId={module.id}
            initialDays={days}
            initialActivities={activities}
            canWrite={canWrite}
          />
        </TabsContent>

        <TabsContent value="reservations">
          <ReservationsPanel moduleId={module.id} initial={initial} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="checklist">
          <TravelChecklistTab moduleId={module.id} initial={checklist} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="gallery">
          <TravelGallery moduleId={module.id} householdId={householdId} initial={gallery} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="expenses">
          {transactions.length === 0 ? (
            <Empty icon={Receipt} title="Sem despesas" description="Adicione pela área de transações." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {transactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{t.description ?? "Despesa"}</p>
                        <p className="text-xs text-text-muted">{fmtRelative(t.occurred_at)}</p>
                      </div>
                      <Money value={Number(t.amount)} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReservationsPanel({
  moduleId,
  initial,
  canWrite,
}: {
  moduleId: string;
  initial: Item[];
  canWrite: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Item>>({ kind: "flight", title: "" });

  function add() {
    if (!canWrite || !draft.title) return;
    start(async () => {
      const { data } = await supabase
        .from("travel_items")
        .insert({
          module_id: moduleId,
          kind: draft.kind ?? "other",
          title: draft.title!,
          planned_amount: draft.planned_amount ?? null,
          actual_amount: draft.actual_amount ?? null,
          start_date: draft.start_date ?? null,
          end_date: draft.end_date ?? null,
          booking_ref: draft.booking_ref ?? null,
        })
        .select("*")
        .single();
      if (data) setItems((s) => [...s, data as Item]);
      setDraft({ kind: "flight", title: "" });
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("travel_items").delete().eq("id", id);
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Nova reserva</p>
          <div className="grid gap-2 sm:grid-cols-6">
            <select
              value={draft.kind ?? "flight"}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
              className="h-10 rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
            <Input
              className="sm:col-span-2"
              placeholder="Reserva (ex.: GRU→LIS)"
              value={draft.title ?? ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Planejado"
              value={draft.planned_amount ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, planned_amount: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
            <Input
              type="date"
              value={draft.start_date ?? ""}
              onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
            />
            <Button onClick={add} disabled={pending || !draft.title}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty icon={Plane} title="Sem reservas" description="Adicione voos, hotéis, transfers." />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center gap-3 p-4">
                <Badge variant="secondary">{KINDS.find((k) => k.key === i.kind)?.label ?? i.kind}</Badge>
                <div className="flex-1">
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-text-muted">
                    {i.start_date && fmtDate(i.start_date)}
                    {i.end_date && ` → ${fmtDate(i.end_date)}`}
                    {i.booking_ref && ` · ${i.booking_ref}`}
                  </p>
                </div>
                <Money value={i.planned_amount} size="sm" />
                {canWrite && (
                  <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TravelGallery({
  moduleId,
  householdId,
  initial,
  canWrite,
}: {
  moduleId: string;
  householdId: string;
  initial: GalleryItem[];
  canWrite: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || !canWrite) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const isVideo = f.type.startsWith("video/");
        const safe = sanitizeFilename(f.name);
        const path = `${householdId}/${moduleId}/${crypto.randomUUID()}-${safe}`;
        // Reusa o bucket obra-gallery por enquanto (policies já cobrem)
        const { error } = await supabase.storage
          .from("obra-gallery")
          .upload(path, f, { cacheControl: "3600", contentType: f.type || undefined });
        if (error) {
          toast.error(`Falha no upload: ${error.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("obra-gallery").getPublicUrl(path);
        const { data: row, error: dbErr } = await supabase
          .from("travel_gallery")
          .insert({
            module_id: moduleId,
            media_type: isVideo ? "video" : "image",
            url: pub.publicUrl,
            caption: null,
          })
          .select("*")
          .single();
        if (dbErr) {
          toast.error(`Falha ao registrar: ${dbErr.message}`);
          continue;
        }
        if (row) setItems((s) => [row as GalleryItem, ...s]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: GalleryItem) {
    if (!canWrite) return;
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;
    setRemovingId(item.id);
    try {
      const marker = "/obra-gallery/";
      const idx = item.url.indexOf(marker);
      const storagePath = idx >= 0 ? item.url.slice(idx + marker.length) : null;
      if (storagePath) {
        const { error: rmErr } = await supabase.storage
          .from("obra-gallery")
          .remove([decodeURIComponent(storagePath)]);
        if (rmErr) {
          toast.error(`Falha ao remover do storage: ${rmErr.message}`);
          return;
        }
      }
      const { error: dbErr } = await supabase.from("travel_gallery").delete().eq("id", item.id);
      if (dbErr) {
        toast.error(`Falha ao remover registro: ${dbErr.message}`);
        return;
      }
      setItems((s) => s.filter((x) => x.id !== item.id));
      toast.success("Arquivo removido.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="surface flex flex-wrap items-center gap-3 p-3">
          <span className="text-xs font-medium">📸 Foto / 🎬 Vídeo</span>
          <Input
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={uploading}
            onChange={(e) => upload(e.target.files)}
            className="max-w-md"
          />
          {uploading && <span className="text-xs text-text-muted">Enviando...</span>}
        </div>
      )}
      {items.length === 0 ? (
        <Empty icon={Camera} title="Galeria vazia" description="Registre os melhores momentos da viagem 📸" />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => {
            const isVideo = i.media_type === "video";
            return (
              <div
                key={i.id}
                className="group relative block aspect-square overflow-hidden rounded-lg border border-border bg-bg-elev-2"
              >
                <a href={i.url} target="_blank" rel="noreferrer" className="block h-full w-full">
                  {isVideo ? (
                    <>
                      <video src={i.url} className="h-full w-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
                          ▶
                        </span>
                      </div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.url}
                      alt={i.caption ?? "Foto da viagem"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </a>
                {canWrite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void remove(i);
                    }}
                    disabled={removingId === i.id}
                    aria-label="Excluir arquivo"
                    className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-text-muted">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{value}</CardContent>
    </Card>
  );
}
