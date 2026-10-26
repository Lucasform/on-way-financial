"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  FolderOpen,
  Images,
  ListTodo,
  Plus,
  Receipt,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Empty } from "@/components/ui/empty";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { uploadObraFile } from "@/lib/supabase/obra-storage";
import { FolderChips, MoveToFolderBar, type ObraFolder } from "@/components/modules/obra-folders";
import { QuickAddExpenseDialog, type SupplierOption } from "@/components/modules/quick-add-expense-dialog";

export interface Module {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
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
  folder_id: string | null;
}
interface Props {
  module: Module;
  spentTotal: number;
  canWrite: boolean;
  suppliers: SupplierOption[];
}

export const OBRA_SECTIONS = [
  { href: "/overview/fornecedores", label: "Fornecedores", icon: Store },
  { href: "/overview/cotacoes", label: "Cotações", icon: Receipt },
  { href: "/overview/atividades", label: "Atividades", icon: ListTodo },
  { href: "/overview/andamento", label: "Andamento", icon: Camera },
  { href: "/overview/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/overview/galeria", label: "Galeria", icon: Images },
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

export function ObraDashboard({ module, spentTotal, canWrite, suppliers }: Props) {
  const router = useRouter();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/overview/gasto" className="block">
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-bg-elev-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Gasto até o momento</CardTitle></CardHeader>
            <CardContent className="pt-0"><Money value={spentTotal} size="xl" /></CardContent>
          </Card>
        </Link>
        {canWrite && (
          <button type="button" onClick={() => setShowQuickAdd(true)} className="block w-full text-left">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-bg-elev-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Adicionar despesa</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2 pt-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-sm text-text-muted">Valor, fornecedor e cotação ou feito</span>
              </CardContent>
            </Card>
          </button>
        )}
      </section>

      {showQuickAdd && (
        <QuickAddExpenseDialog
          suppliers={suppliers}
          onCancel={() => setShowQuickAdd(false)}
          onDone={() => {
            setShowQuickAdd(false);
            router.refresh();
          }}
        />
      )}

      <section className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:hidden">
        {OBRA_SECTIONS.map(({ href, label, icon: Icon }) => (
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

export function Gallery({
  moduleId,
  householdId,
  initial,
  initialFolders,
  canWrite,
}: {
  moduleId: string;
  householdId: string;
  initial: GalleryItem[];
  initialFolders: ObraFolder[];
  canWrite: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [folders, setFolders] = useState(initialFolders);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleItems = selectedFolder ? items.filter((i) => i.folder_id === selectedFolder) : items;

  function toggleSelected(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function moveSelected(folderId: string | null) {
    if (!canWrite || selectedIds.size === 0) return;
    const targets = items.filter((i) => selectedIds.has(i.id) && i.folder_id !== folderId);
    if (targets.length === 0) {
      toast.info("Os itens selecionados já estão nessa pasta.");
      setSelectedIds(new Set());
      return;
    }
    const ids = targets.map((i) => i.id);
    const { data, error } = await supabase
      .from("obra_gallery")
      .update({ folder_id: folderId })
      .in("id", ids)
      .select("id");
    if (error) {
      toast.error("Falha ao mover arquivos.");
      return;
    }
    const movedIds = new Set((data ?? []).map((r) => r.id));
    setItems((s) => s.map((i) => (movedIds.has(i.id) ? { ...i, folder_id: folderId } : i)));
    setSelectedIds(new Set());
    if (movedIds.size < ids.length) {
      toast.error(`Só consegui mover ${movedIds.size} de ${ids.length}. Confere sua permissão na obra.`);
    } else {
      toast.success(`${movedIds.size} arquivo${movedIds.size === 1 ? "" : "s"} movido${movedIds.size === 1 ? "" : "s"}.`);
    }
  }

  function selectFolder(id: string | null) {
    setSelectedFolder(id);
    setSelectedIds(new Set());
  }

  async function createFolder(name: string) {
    if (!canWrite) return;
    const { data, error } = await supabase
      .from("obra_folders")
      .insert({ module_id: moduleId, kind: "gallery", name })
      .select("id, name, kind")
      .single();
    if (error || !data) {
      toast.error("Falha ao criar pasta.");
      return;
    }
    setFolders((s) => [...s, data as ObraFolder]);
  }

  async function deleteFolder(id: string) {
    if (!canWrite) return;
    const { error } = await supabase.from("obra_folders").delete().eq("id", id);
    if (error) {
      toast.error("Falha ao apagar pasta.");
      return;
    }
    setFolders((s) => s.filter((f) => f.id !== id));
    setItems((s) => s.map((i) => (i.folder_id === id ? { ...i, folder_id: null } : i)));
    if (selectedFolder === id) setSelectedFolder(null);
  }

  async function upload(files: FileList | null) {
    if (!files || !canWrite) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const isVideo = f.type.startsWith("video/");
        const result = await uploadObraFile(supabase, "obra-gallery", householdId, moduleId, f);
        if ("error" in result) {
          toast.error(`Falha no upload: ${result.error}`);
          continue;
        }
        const url = result.url;
        const { data: row, error: dbErr } = await supabase
          .from("obra_gallery")
          .insert({
            module_id: moduleId,
            image_url: url,
            caption: null,
            media_type: isVideo ? "video" : "image",
            folder_id: uploadFolderId || null,
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
      setSelectedIds((s) => {
        if (!s.has(item.id)) return s;
        const next = new Set(s);
        next.delete(item.id);
        return next;
      });
      toast.success("Arquivo removido.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <FolderChips
        folders={folders}
        selected={selectedFolder}
        onSelect={selectFolder}
        onCreate={createFolder}
        onDelete={deleteFolder}
        canWrite={canWrite}
      />

      {canWrite && selectedIds.size > 0 && (
        <MoveToFolderBar
          count={selectedIds.size}
          folders={folders}
          excludeFolderId={selectedFolder}
          onMove={moveSelected}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

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
          <select
            value={uploadFolderId}
            onChange={(e) => setUploadFolderId(e.target.value)}
            aria-label="Pasta de destino"
            className="h-9 rounded-md border border-border bg-bg-elev px-2 text-xs"
          >
            <option value="">Sem pasta</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {uploading && <span className="text-xs text-text-muted">Enviando...</span>}
        </div>
      )}
      {visibleItems.length === 0 ? (
        <Empty
          icon={Camera}
          title={selectedFolder ? "Pasta vazia" : "Galeria da obra vazia"}
          description="Bora registrar essa transformação 📸 com fotos e vídeos pra deixar o sonho documentado."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((i) => {
            const isVideo = i.media_type === "video";
            return (
              <div
                key={i.id}
                className={`group relative block aspect-square overflow-hidden rounded-lg border bg-bg-elev-2 ${
                  selectedIds.has(i.id) ? "border-primary ring-2 ring-primary" : "border-border"
                }`}
              >
                {canWrite && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(i.id)}
                    onChange={() => toggleSelected(i.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Selecionar arquivo"
                    className="absolute left-1.5 top-1.5 z-10 h-5 w-5 accent-primary"
                  />
                )}
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
                    className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-danger disabled:opacity-50"
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

