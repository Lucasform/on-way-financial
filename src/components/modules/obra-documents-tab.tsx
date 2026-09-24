"use client";

import { useMemo, useState } from "react";
import { File, FileImage, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { sanitizeFilename } from "@/lib/utils";
import { FolderChips, type ObraFolder } from "@/components/modules/obra-folders";

export interface ObraDocument {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
  folder_id: string | null;
}

interface Props {
  moduleId: string;
  householdId: string;
  initial: ObraDocument[];
  initialFolders: ObraFolder[];
  canWrite: boolean;
}

function iconFor(type: string | null) {
  if (type?.startsWith("image/")) return FileImage;
  if (type === "application/pdf") return FileText;
  return File;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ObraDocumentsTab({ moduleId, householdId, initial, initialFolders, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [docs, setDocs] = useState(initial);
  const [folders, setFolders] = useState(initialFolders);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const visibleDocs = useMemo(
    () => (selectedFolder ? docs.filter((d) => d.folder_id === selectedFolder) : docs),
    [docs, selectedFolder],
  );

  function pickFile(files: FileList | null) {
    const file = files?.[0] ?? null;
    setPendingFile(file);
    if (file && !name.trim()) {
      setName(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function createFolder(folderName: string) {
    if (!canWrite) return;
    const { data, error } = await supabase
      .from("obra_folders")
      .insert({ module_id: moduleId, kind: "document", name: folderName })
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
    setDocs((s) => s.map((d) => (d.folder_id === id ? { ...d, folder_id: null } : d)));
    if (selectedFolder === id) setSelectedFolder(null);
  }

  async function upload() {
    if (!canWrite || !pendingFile || !name.trim()) return;
    setUploading(true);
    try {
      const safe = sanitizeFilename(pendingFile.name);
      const path = `${householdId}/${moduleId}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("obra-documents")
        .upload(path, pendingFile, { cacheControl: "3600", contentType: pendingFile.type || undefined });
      if (upErr) {
        toast.error(`Falha no upload: ${upErr.message}`);
        return;
      }
      const { data: pub } = supabase.storage.from("obra-documents").getPublicUrl(path);
      const { data, error } = await supabase
        .from("obra_documents")
        .insert({
          module_id: moduleId,
          name: name.trim(),
          file_url: pub.publicUrl,
          file_type: pendingFile.type || null,
          size_bytes: pendingFile.size,
          folder_id: uploadFolderId || null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao salvar documento.");
        return;
      }
      setDocs((s) => [data as ObraDocument, ...s]);
      setPendingFile(null);
      setName("");
      toast.success("Documento adicionado.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(doc: ObraDocument) {
    if (!canWrite) return;
    if (!confirm(`Apagar "${doc.name}"?`)) return;
    setRemovingId(doc.id);
    try {
      const marker = "/obra-documents/";
      const idx = doc.file_url.indexOf(marker);
      const storagePath = idx >= 0 ? doc.file_url.slice(idx + marker.length) : null;
      if (storagePath) {
        await supabase.storage.from("obra-documents").remove([decodeURIComponent(storagePath)]);
      }
      const { error } = await supabase.from("obra_documents").delete().eq("id", doc.id);
      if (error) {
        toast.error("Falha ao remover.");
        return;
      }
      setDocs((s) => s.filter((d) => d.id !== doc.id));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <FolderChips
        folders={folders}
        selected={selectedFolder}
        onSelect={setSelectedFolder}
        onCreate={createFolder}
        onDelete={deleteFolder}
        canWrite={canWrite}
      />

      {canWrite && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Novo documento</p>
          <div className="grid gap-2 sm:grid-cols-6">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="dname">Nome</Label>
              <Input
                id="dname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Ex: "Planta baixa - térreo", "Contrato eletricista"'
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="dfile">Arquivo</Label>
              <Input id="dfile" type="file" onChange={(e) => pickFile(e.target.files)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dfolder">Pasta</Label>
              <select
                id="dfolder"
                value={uploadFolderId}
                onChange={(e) => setUploadFolderId(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                <option value="">Sem pasta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={upload} disabled={uploading || !pendingFile || !name.trim()} className="w-full">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Enviar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {visibleDocs.length === 0 ? (
        <Empty
          icon={File}
          title={selectedFolder ? "Pasta vazia" : "Sem documentos"}
          description="Plantas, contratos, projetos — guarde tudo aqui, nomeado."
        />
      ) : (
        <ul className="space-y-2">
          {visibleDocs.map((d) => {
            const Icon = iconFor(d.file_type);
            return (
              <li key={d.id}>
                <Card className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-elev-2 text-text-muted">
                    <Icon className="h-5 w-5" />
                  </span>
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-text-muted">
                      {fmtDate(d.created_at, "dd/MM/yyyy")}
                      {d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ""}
                    </p>
                  </a>
                  {canWrite && (
                    <Button variant="ghost" size="icon" onClick={() => remove(d)} disabled={removingId === d.id}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
