"use client";

import { useState } from "react";
import { Folder, FolderPlus, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ObraFolder {
  id: string;
  name: string;
  kind: "document" | "gallery";
}

interface Props {
  folders: ObraFolder[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  canWrite: boolean;
}

export function FolderChips({ folders, selected, onSelect, onCreate, onDelete, canWrite }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          selected === null
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-text-muted hover:bg-bg-elev-2",
        )}
      >
        Todos
      </button>
      {folders.map((f) => (
        <span
          key={f.id}
          className={cn(
            "group flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            selected === f.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-text-muted hover:bg-bg-elev-2",
          )}
        >
          <button type="button" onClick={() => onSelect(f.id)} className="flex items-center gap-1">
            <Folder className="h-3 w-3" />
            {f.name}
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Apagar a pasta "${f.name}"? Os arquivos continuam, só saem da pasta.`)) {
                  onDelete(f.id);
                }
              }}
              aria-label={`Apagar pasta ${f.name}`}
              className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {canWrite &&
        (creating ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") {
                  setCreating(false);
                  setName("");
                }
              }}
              onBlur={() => {
                if (!name.trim()) setCreating(false);
              }}
              placeholder="Nome da pasta"
              className="h-6 w-32 rounded-full border border-border bg-bg-elev px-2.5 text-xs outline-none focus:border-primary"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:border-primary/50 hover:text-text"
          >
            <FolderPlus className="h-3 w-3" /> Nova pasta
          </button>
        ))}
    </div>
  );
}
