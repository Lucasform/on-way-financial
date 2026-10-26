"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface ChecklistItem {
  id: string;
  phase_name: string;
  name: string;
  status: string;
}

interface Props {
  moduleId: string;
  initial: ChecklistItem[];
  canWrite: boolean;
  onPromote?: (title: string) => void;
}

export function ObraChecklistTab({ moduleId, initial, canWrite, onPromote }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ group: "", name: "" });
  const [pending, start] = useTransition();
  const { confirm, ConfirmDialog } = useConfirm();

  const groups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const it of items) {
      map.set(it.phase_name, [...(map.get(it.phase_name) ?? []), it]);
    }
    return [...map.entries()];
  }, [items]);

  function toggleGroup(name: string) {
    setOpenGroups((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleDone(item: ChecklistItem) {
    if (!canWrite) return;
    const nextStatus = item.status === "done" ? "pending" : "done";
    setItems((s) => s.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)));
    start(async () => {
      const { error } = await supabase.from("obra_checklist_items").update({ status: nextStatus }).eq("id", item.id);
      if (error) {
        setItems((s) => s.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)));
        toast.error("Falha ao atualizar.");
      }
    });
  }

  async function removeItem(item: ChecklistItem) {
    if (!canWrite) return;
    if (!(await confirm(`Apagar "${item.name}"?`, { danger: true }))) return;
    setItems((s) => s.filter((i) => i.id !== item.id));
    const { error } = await supabase.from("obra_checklist_items").delete().eq("id", item.id);
    if (error) toast.error("Falha ao apagar.");
  }

  function addItem() {
    if (!canWrite || !newItem.name.trim()) return;
    const group = newItem.group.trim() || "Geral";
    start(async () => {
      const { data, error } = await supabase
        .from("obra_checklist_items")
        .insert({ module_id: moduleId, phase_name: group, category: "processo", name: newItem.name.trim() })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao adicionar.");
        return;
      }
      setItems((s) => [...s, data as ChecklistItem]);
      setOpenGroups((s) => new Set(s).add(group));
      setNewItem({ group: "", name: "" });
      setShowAdd(false);
    });
  }

  return (
    <div className="space-y-4">
      {ConfirmDialog}
      {canWrite && !showAdd && (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar item
        </Button>
      )}
      {canWrite && showAdd && (
        <Card className="p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="O que precisa fazer"
              className="sm:col-span-2"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <Input
              value={newItem.group}
              onChange={(e) => setNewItem({ ...newItem, group: e.target.value })}
              placeholder="Grupo (opcional)"
              list="checklist-groups"
            />
            <datalist id="checklist-groups">
              {groups.map(([name]) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={pending || !newItem.name.trim()} onClick={addItem}>
              Salvar
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {groups.map(([groupName, groupItems]) => {
          const open = openGroups.has(groupName);
          const done = groupItems.filter((i) => i.status === "done").length;
          return (
            <Card key={groupName} className="overflow-hidden p-0">
              <button
                type="button"
                onClick={() => toggleGroup(groupName)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-bg-elev-2"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {groupName}
                </span>
                <span className="text-[11px] text-text-muted">
                  {done}/{groupItems.length} feitos
                </span>
              </button>
              {open && (
                <ul className="divide-y divide-border border-t border-border">
                  {groupItems.map((item) => {
                    const checked = item.status === "done";
                    return (
                      <li key={item.id} className="flex items-center gap-2 p-3 text-sm">
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => toggleDone(item)}
                          aria-label={checked ? "Marcar como pendente" : "Marcar como feito"}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            checked ? "border-success bg-success text-white" : "border-border"
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <p className={`flex-1 ${checked ? "text-text-muted line-through" : ""}`}>{item.name}</p>
                        {canWrite && onPromote && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => onPromote(item.name)}
                            aria-label="Criar tarefa a partir desse item"
                            title="Criar tarefa"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => removeItem(item)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
        {groups.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-text-muted">
            <ClipboardCheck className="h-6 w-6" />
            Checklist vazio.
          </Card>
        )}
      </div>
    </div>
  );
}
