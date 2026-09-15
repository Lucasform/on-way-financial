"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Camera,
  FolderOpen,
  Images,
  KanbanSquare,
  MessageCircle,
  Package,
  Plus,
  Receipt,
  Store,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Empty } from "@/components/ui/empty";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { normalizePhone, sanitizeFilename, waLink } from "@/lib/utils";

export interface Module {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}
export interface Phase {
  id: string;
  name: string;
  planned_budget: number | null;
  status: string;
  position: number;
  planned_start: string | null;
  planned_end: string | null;
}
export interface Worker {
  id: string;
  name: string;
  role: string | null;
  whatsapp_phone: string | null;
  daily_rate: number | null;
}
export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  taken_at: string;
  phase_id: string | null;
  media_type?: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
}
interface Props {
  module: Module;
  transactions: { amount: number | string }[];
  canWrite: boolean;
}

const KANBAN = ["todo", "doing", "done", "blocked"] as const;

const SECTIONS = [
  { href: "/overview/previsao", label: "Previsão", icon: Target },
  { href: "/overview/fases", label: "Fases", icon: KanbanSquare },
  { href: "/overview/materiais", label: "Materiais", icon: Package },
  { href: "/overview/fornecedores", label: "Fornecedores", icon: Store },
  { href: "/overview/cotacoes", label: "Cotações", icon: Receipt },
  { href: "/overview/andamento", label: "Andamento", icon: Camera },
  { href: "/overview/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/overview/galeria", label: "Galeria", icon: Images },
  { href: "/overview/equipe", label: "Equipe", icon: Users },
] as const;

function statusLabel(s: string): string {
  switch (s) {
    case "active": return "ativo";
    case "paused": return "pausado";
    case "completed": return "concluído";
    case "archived": return "arquivado";
    default: return s;
  }
}

export function ObraDashboard({ module, transactions, canWrite }: Props) {
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">🧱 {module.name}</h1>
          <p className="text-sm text-text-muted">
            {module.start_date && <>Início {module.start_date}</>}{" "}
            {module.end_date && <>· Previsão {module.end_date}</>}
          </p>
        </div>
        <Badge variant={module.status === "active" ? "success" : "secondary"}>{statusLabel(module.status)}</Badge>
      </header>

      <section>
        <Link href="/transactions">
          <Card className="transition-colors hover:border-primary/50 hover:bg-bg-elev-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Realizado</CardTitle></CardHeader>
            <CardContent className="pt-0"><Money value={total} size="xl" /></CardContent>
          </Card>
        </Link>
      </section>

      <section className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {SECTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-bg-elev px-2 py-3 text-text-muted transition-colors hover:border-primary/50 hover:bg-bg-elev-2 hover:text-text"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-elev-2 text-text-muted transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-center text-[11px] font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </section>
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

export function PhasesKanban({
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

  function remove(id: string) {
    if (!canWrite) return;
    if (!confirm("Apagar esta fase? Os itens ligados a ela ficam sem fase.")) return;
    start(async () => {
      const { error } = await supabase.from("obra_phases").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao apagar fase.");
        return;
      }
      setPhases((s) => s.filter((p) => p.id !== id));
    });
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
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium">{p.name}</p>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => remove(p.id)}
                            aria-label="Apagar fase"
                            className="shrink-0 text-text-muted hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
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

export function Gallery({ moduleId, householdId, initial, canWrite }: { moduleId: string; householdId: string; initial: GalleryItem[]; canWrite: boolean }) {
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

export function WorkersPanel({ moduleId, initial, canWrite }: { moduleId: string; initial: Worker[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [workers, setWorkers] = useState(initial);
  const [draft, setDraft] = useState<Partial<Worker>>({ name: "", role: "", whatsapp_phone: "" });
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

  function remove(id: string) {
    if (!canWrite) return;
    if (!confirm("Remover essa pessoa da equipe?")) return;
    start(async () => {
      const { error } = await supabase.from("obra_workers").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao remover.");
        return;
      }
      setWorkers((s) => s.filter((w) => w.id !== id));
    });
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
                <a
                  href={waLink(w.whatsapp_phone)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir WhatsApp"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success hover:bg-success/25"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
              {canWrite && (
                <Button variant="ghost" size="icon" onClick={() => remove(w.id)} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
