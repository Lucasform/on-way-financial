"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Camera, Hammer, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Empty } from "@/components/ui/empty";
import { ObraDiaryTab, type DiaryEntry } from "@/components/modules/obra-diary-tab";
import { ObraItemsTab, type ObraItem } from "@/components/modules/obra-items-tab";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtRelative } from "@/lib/dates";
import { normalizePhone, sanitizeFilename } from "@/lib/utils";
import { percent } from "@/lib/money";

interface Module {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}
interface Phase {
  id: string;
  name: string;
  planned_budget: number | null;
  status: string;
  position: number;
  planned_start: string | null;
  planned_end: string | null;
}
interface Worker {
  id: string;
  name: string;
  role: string | null;
  whatsapp_phone: string | null;
  daily_rate: number | null;
}
interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  taken_at: string;
  phase_id: string | null;
  media_type?: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
}
interface Tx {
  id: string;
  amount: number | string;
  description: string | null;
  occurred_at: string;
  categories: { name: string; color: string | null } | null;
}

interface Props {
  module: Module;
  phases: Phase[];
  workers: Worker[];
  gallery: GalleryItem[];
  transactions: Tx[];
  items: ObraItem[];
  diary: DiaryEntry[];
  householdId: string;
  userId: string;
  canWrite: boolean;
}

const KANBAN = ["todo", "doing", "done", "blocked"] as const;

export function ObraDashboard({ module, phases, workers, gallery, transactions, items, diary, householdId, canWrite }: Props) {
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const pct = module.budget ? percent(total, Number(module.budget)) : 0;
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/modules" className="text-xs text-text-muted hover:text-text">← Módulos</Link>
          <h1 className="mt-1 text-2xl font-semibold">🧱 {module.name}</h1>
          <p className="text-sm text-text-muted">
            {module.start_date && <>Início {module.start_date}</>}{" "}
            {module.end_date && <>· Previsão {module.end_date}</>}
          </p>
        </div>
        <Badge variant={module.status === "active" ? "success" : "secondary"}>{module.status}</Badge>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Realizado</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={total} size="xl" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Orçamento</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={module.budget} size="xl" tone="muted" /></CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">% Orçamento usado</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="font-mono text-2xl">{pct.toFixed(1)}%</p>
            <div className="h-2 overflow-hidden rounded-full bg-bg-elev-2">
              <div
                className={`h-full ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="phases">
        <TabsList>
          <TabsTrigger value="phases">Fases</TabsTrigger>
          <TabsTrigger value="items">Materiais</TabsTrigger>
          <TabsTrigger value="diary">Diário</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="gallery">Galeria</TabsTrigger>
          <TabsTrigger value="workers">Equipe</TabsTrigger>
        </TabsList>
        <TabsContent value="phases">
          <PhasesKanban moduleId={module.id} phases={phases} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="items">
          <ObraItemsTab
            moduleId={module.id}
            initial={items}
            phases={phases.map((p) => ({ id: p.id, name: p.name }))}
            canWrite={canWrite}
          />
        </TabsContent>
        <TabsContent value="diary">
          <ObraDiaryTab
            moduleId={module.id}
            initial={diary}
            phases={phases.map((p) => ({ id: p.id, name: p.name }))}
            canWrite={canWrite}
          />
        </TabsContent>
        <TabsContent value="expenses">
          {transactions.length === 0 ? (
            <Empty icon={Hammer} title="Sem despesas" description="Adicione pela área de transações." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {transactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{t.description ?? t.categories?.name ?? "—"}</p>
                        <p className="text-xs text-text-muted">{fmtRelative(t.occurred_at)} · {t.categories?.name ?? "—"}</p>
                      </div>
                      <Money value={Number(t.amount)} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="gallery">
          <Gallery moduleId={module.id} householdId={householdId} initial={gallery} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="workers">
          <WorkersPanel moduleId={module.id} initial={workers} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const COL_LABEL: Record<string, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  done: "Concluídas",
  blocked: "Bloqueadas",
};

const COL_COLOR: Record<string, string> = {
  todo: "text-text-muted",
  doing: "text-accent",
  done: "text-success",
  blocked: "text-danger",
};

function PhasesKanban({
  moduleId,
  phases: initialPhases,
  canWrite,
}: {
  moduleId: string;
  phases: Phase[];
  canWrite: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const [phases, setPhases] = useState(initialPhases);
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<string | null>(null);

  async function move(id: string, status: string) {
    if (!canWrite) return;
    const cur = phases.find((p) => p.id === id);
    if (!cur || cur.status === status) return;
    // optimistic
    setPhases((s) => s.map((p) => (p.id === id ? { ...p, status } : p)));
    start(async () => {
      const { error } = await supabase.from("obra_phases").update({ status }).eq("id", id);
      if (error) {
        // rollback
        setPhases((s) => s.map((p) => (p.id === id ? { ...p, status: cur.status } : p)));
        toast.error("Não consegui mover.");
      }
    });
  }

  function add() {
    if (!canWrite || !newName.trim()) return;
    start(async () => {
      const { data } = await supabase
        .from("obra_phases")
        .insert({ module_id: moduleId, name: newName.trim(), position: phases.length * 10 + 10 })
        .select("*")
        .single();
      if (data) setPhases((s) => [...s, data as Phase]);
      setNewName("");
    });
  }

  function onDragStart(e: React.DragEvent, id: string) {
    if (!canWrite) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/phase-id", id);
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDropZone(null);
  }

  function onDragOver(e: React.DragEvent, col: string) {
    if (!canWrite) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropZone !== col) setDropZone(col);
  }

  function onDragLeave(col: string) {
    if (dropZone === col) setDropZone(null);
  }

  function onDrop(e: React.DragEvent, col: string) {
    if (!canWrite) return;
    e.preventDefault();
    const id = e.dataTransfer.getData("text/phase-id");
    if (id) void move(id, col);
    setDropZone(null);
    setDraggingId(null);
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova fase..." />
          <Button onClick={add} disabled={pending}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      )}
      {canWrite && (
        <p className="text-[10px] text-text-muted">💡 Arraste os cards entre as colunas pra mover.</p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {KANBAN.map((col) => {
          const colPhases = phases.filter((p) => p.status === col);
          const isDropTarget = dropZone === col;
          return (
            <div
              key={col}
              onDragOver={(e) => onDragOver(e, col)}
              onDragLeave={() => onDragLeave(col)}
              onDrop={(e) => onDrop(e, col)}
              className={
                "rounded-lg border bg-bg-elev p-3 transition-colors " +
                (isDropTarget ? "border-primary bg-primary/5" : "border-border")
              }
            >
              <div className={"mb-2 flex items-center justify-between text-xs font-semibold uppercase " + COL_COLOR[col]!}>
                <span>{COL_LABEL[col] ?? col}</span>
                <span className="rounded-full bg-bg-elev-2 px-1.5 py-0.5 text-[10px] text-text-muted">
                  {colPhases.length}
                </span>
              </div>
              <ul className="min-h-[60px] space-y-2">
                {colPhases.map((p) => {
                  const isDragging = draggingId === p.id;
                  return (
                    <li
                      key={p.id}
                      draggable={canWrite}
                      onDragStart={(e) => onDragStart(e, p.id)}
                      onDragEnd={onDragEnd}
                      className={
                        "rounded-md bg-bg-elev-2 p-2.5 text-sm transition-all " +
                        (canWrite ? "cursor-grab active:cursor-grabbing hover:bg-bg-elev-3 " : "") +
                        (isDragging ? "opacity-50" : "")
                      }
                    >
                      <p className="font-medium">{p.name}</p>
                      {p.planned_budget && (
                        <p className="text-xs text-text-muted">
                          <Money value={p.planned_budget} size="sm" tone="muted" />
                        </p>
                      )}
                      {canWrite && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {KANBAN.filter((c) => c !== col).map((c) => (
                            <Button
                              key={c}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => move(p.id, c)}
                            >
                              → {COL_LABEL[c]}
                            </Button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
                {colPhases.length === 0 && (
                  <li className="rounded-md border border-dashed border-border p-3 text-center text-[10px] text-text-muted">
                    {canWrite ? "solte aqui" : "vazio"}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Gallery({ moduleId, householdId, initial, canWrite }: { moduleId: string; householdId: string; initial: GalleryItem[]; canWrite: boolean }) {
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
        const { error } = await supabase.storage
          .from("obra-gallery")
          .upload(path, f, { cacheControl: "3600", contentType: f.type || undefined });
        if (error) {
          toast.error(`Falha no upload: ${error.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("obra-gallery").getPublicUrl(path);
        const url = pub.publicUrl;
        const { data: row, error: dbErr } = await supabase
          .from("obra_gallery")
          .insert({
            module_id: moduleId,
            image_url: url,
            caption: null,
            media_type: isVideo ? "video" : "image",
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
      const idx = item.image_url.indexOf(marker);
      const storagePath = idx >= 0 ? item.image_url.slice(idx + marker.length) : null;
      if (storagePath) {
        const { error: rmErr } = await supabase.storage
          .from("obra-gallery")
          .remove([decodeURIComponent(storagePath)]);
        if (rmErr) {
          toast.error(`Falha ao remover do storage: ${rmErr.message}`);
          return;
        }
      }
      const { error: dbErr } = await supabase.from("obra_gallery").delete().eq("id", item.id);
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
          <Label htmlFor="gphoto" className="text-xs font-medium">
            📸 Foto / 🎬 Vídeo
          </Label>
          <Input
            id="gphoto"
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
        <Empty
          icon={Camera}
          title="Galeria da obra vazia"
          description="Bora registrar essa transformação 📸 com fotos e vídeos pra deixar o sonho documentado."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => {
            const isVideo = i.media_type === "video";
            return (
              <div
                key={i.id}
                className="group relative block aspect-square overflow-hidden rounded-lg border border-border bg-bg-elev-2"
              >
                <a href={i.image_url} target="_blank" rel="noreferrer" className="block h-full w-full">
                  {isVideo ? (
                    <>
                      <video src={i.image_url} className="h-full w-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
                          ▶
                        </span>
                      </div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image_url} alt={i.caption ?? "Foto da obra"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-xs text-white">{i.caption ?? (isVideo ? "Vídeo" : "Foto")}</p>
                  </div>
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

function WorkersPanel({ moduleId, initial, canWrite }: { moduleId: string; initial: Worker[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [workers, setWorkers] = useState(initial);
  const [draft, setDraft] = useState<Partial<Worker>>({ name: "", role: "", whatsapp_phone: "" });
  const [composer, setComposer] = useState<{ workerId: string; body: string } | null>(null);
  const [pending, start] = useTransition();

  function addWorker() {
    if (!canWrite || !draft.name) return;
    start(async () => {
      const { data } = await supabase
        .from("obra_workers")
        .insert({
          module_id: moduleId,
          name: draft.name!,
          role: draft.role ?? null,
          whatsapp_phone: draft.whatsapp_phone ? normalizePhone(draft.whatsapp_phone) : null,
          daily_rate: draft.daily_rate ?? null,
        })
        .select("*")
        .single();
      if (data) setWorkers((s) => [...s, data as Worker]);
      setDraft({ name: "", role: "", whatsapp_phone: "" });
    });
  }

  async function sendMessage(workerId: string, body: string) {
    const w = workers.find((x) => x.id === workerId);
    if (!w?.whatsapp_phone) return;
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: w.whatsapp_phone, body, module_id: moduleId, worker_id: workerId }),
    });
    if (!res.ok) {
      toast.error("Falha ao enviar.");
      return;
    }
    toast.success("Mensagem enviada.");
    setComposer(null);
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Nome" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input placeholder="Função (pedreiro, eletricista...)" value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
            <Input placeholder="WhatsApp" value={draft.whatsapp_phone ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp_phone: e.target.value })} />
            <Button onClick={addWorker} disabled={pending || !draft.name}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        </Card>
      )}
      <ul className="space-y-2">
        {workers.map((w) => (
          <li key={w.id}>
            <Card className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="font-semibold">{w.name}</p>
                <p className="text-xs text-text-muted">{w.role ?? "—"} · {w.whatsapp_phone ?? "Sem WhatsApp"}</p>
              </div>
              {w.whatsapp_phone && (
                <Button variant="outline" size="sm" onClick={() => setComposer({ workerId: w.id, body: "" })}>
                  <MessageSquare className="h-4 w-4" /> Mensagem
                </Button>
              )}
            </Card>
            {composer?.workerId === w.id && (
              <Card className="mt-2 p-4">
                <Textarea value={composer.body} onChange={(e) => setComposer({ ...composer, body: e.target.value })} placeholder="Olá! Pode passar amanhã às 9h?" />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setComposer(null)}>Cancelar</Button>
                  <Button size="sm" disabled={!composer.body.trim()} onClick={() => sendMessage(w.id, composer.body)}>
                    <Send className="h-4 w-4" /> Enviar
                  </Button>
                </div>
              </Card>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
