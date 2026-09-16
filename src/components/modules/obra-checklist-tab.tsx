"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, ClipboardCheck, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface ChecklistItem {
  id: string;
  phase_name: string;
  category: string;
  name: string;
  unit: string | null;
  estimated_value: number | null;
  is_estimate: boolean;
  status: string;
  obra_item_id: string | null;
}

interface Props {
  moduleId: string;
  initial: ChecklistItem[];
  canWrite: boolean;
}

const CATEGORIES = ["material", "serviço", "processo"] as const;
const CATEGORY_TONE: Record<string, "default" | "secondary" | "success" | "warning"> = {
  material: "default",
  "serviço": "warning",
  processo: "secondary",
};

export function ObraChecklistTab({ moduleId, initial, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [valueDraft, setValueDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ phase_name: "", category: "material" as string, name: "", unit: "" });
  const [pending, start] = useTransition();

  const phases = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const it of items) {
      map.set(it.phase_name, [...(map.get(it.phase_name) ?? []), it]);
    }
    return [...map.entries()];
  }, [items]);

  function togglePhase(name: string) {
    setOpenPhases((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function startEdit(item: ChecklistItem) {
    if (!canWrite) return;
    setEditingId(item.id);
    setValueDraft(item.estimated_value != null ? String(item.estimated_value) : "");
  }

  function saveValue(item: ChecklistItem) {
    const num = valueDraft.trim() === "" ? null : Number(valueDraft.replace(",", "."));
    setItems((s) => s.map((i) => (i.id === item.id ? { ...i, estimated_value: num } : i)));
    setEditingId(null);
    start(async () => {
      await supabase.from("obra_checklist_items").update({ estimated_value: num }).eq("id", item.id);
    });
  }

  async function addToTable(item: ChecklistItem) {
    if (!canWrite || item.estimated_value == null || busyId) return;
    setBusyId(item.id);
    try {
      const { data, error } = await supabase
        .from("obra_items")
        .insert({
          module_id: moduleId,
          category: item.category === "material" ? "material" : "serviço",
          name: item.name,
          unit: item.unit ?? "un",
          quantity: 1,
          unit_price: item.estimated_value,
          status: "planned",
          notes: item.is_estimate ? "Valor estimado (checklist)" : "Valor exato (checklist)",
        })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Falha ao adicionar à tabela.");
        return;
      }
      const { error: updErr } = await supabase
        .from("obra_checklist_items")
        .update({ status: "added", obra_item_id: data.id })
        .eq("id", item.id);
      if (updErr) {
        toast.error("Item criado, mas falhou marcar o checklist.");
      }
      setItems((s) => s.map((i) => (i.id === item.id ? { ...i, status: "added", obra_item_id: data.id } : i)));
      toast.success("Adicionado em Materiais.");
    } finally {
      setBusyId(null);
    }
  }

  function removeItem(id: string) {
    if (!canWrite) return;
    if (!confirm("Remover esse item do checklist?")) return;
    setItems((s) => s.filter((i) => i.id !== id));
    start(async () => {
      await supabase.from("obra_checklist_items").delete().eq("id", id);
    });
  }

  function addCustomItem() {
    if (!canWrite || !newItem.phase_name.trim() || !newItem.name.trim()) return;
    start(async () => {
      const { data, error } = await supabase
        .from("obra_checklist_items")
        .insert({
          module_id: moduleId,
          phase_name: newItem.phase_name.trim(),
          category: newItem.category,
          name: newItem.name.trim(),
          unit: newItem.unit.trim() || null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao adicionar.");
        return;
      }
      setItems((s) => [...s, data as ChecklistItem]);
      setOpenPhases((s) => new Set(s).add(data.phase_name));
      setNewItem({ phase_name: "", category: "material", name: "", unit: "" });
      setShowAdd(false);
      toast.success("Item adicionado ao checklist.");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">
        Consulte o que falta por fase, da terraplenagem ao acabamento. Preencha o valor (médio ou
        exato) e clique em <ShoppingCart className="inline h-3 w-3" /> pra jogar em Materiais.
      </p>

      {canWrite && !showAdd && (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar item ao checklist
        </Button>
      )}
      {canWrite && showAdd && (
        <Card className="p-3">
          <div className="grid gap-2 sm:grid-cols-5">
            <Input
              value={newItem.phase_name}
              onChange={(e) => setNewItem({ ...newItem, phase_name: e.target.value })}
              placeholder="Fase (ex: Alvenaria)"
              list="checklist-phases"
            />
            <datalist id="checklist-phases">
              {phases.map(([name]) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Input
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Nome"
              className="sm:col-span-2"
            />
            <Input
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              placeholder="Unidade"
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button size="sm" disabled={pending || !newItem.phase_name.trim() || !newItem.name.trim()} onClick={addCustomItem}>
              Salvar
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {phases.map(([phaseName, phaseItems]) => {
          const open = openPhases.has(phaseName);
          const withValue = phaseItems.filter((i) => i.estimated_value != null).length;
          const added = phaseItems.filter((i) => i.status === "added").length;
          return (
            <Card key={phaseName} className="overflow-hidden p-0">
              <button
                type="button"
                onClick={() => togglePhase(phaseName)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-bg-elev-2"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {phaseName}
                </span>
                <span className="text-[11px] text-text-muted">
                  {added}/{phaseItems.length} na tabela · {withValue}/{phaseItems.length} com valor
                </span>
              </button>
              {open && (
                <ul className="divide-y divide-border border-t border-border">
                  {phaseItems.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                      <Badge variant={CATEGORY_TONE[item.category] ?? "default"} className="shrink-0">
                        {item.category}
                      </Badge>
                      <div className="min-w-[10rem] flex-1">
                        <p className="font-medium">{item.name}</p>
                        {item.unit && <p className="text-[11px] text-text-muted">{item.unit}</p>}
                      </div>

                      {editingId === item.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={valueDraft}
                          onChange={(e) => setValueDraft(e.target.value)}
                          onBlur={() => saveValue(item)}
                          onKeyDown={(e) => e.key === "Enter" && saveValue(item)}
                          placeholder="Valor"
                          className="h-8 w-28"
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => startEdit(item)}
                          className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-text-muted hover:border-primary/50 hover:text-text"
                        >
                          {item.estimated_value != null ? <Money value={item.estimated_value} size="sm" /> : "definir valor"}
                        </button>
                      )}

                      {item.status === "added" ? (
                        <Badge variant="success" className="shrink-0">na tabela</Badge>
                      ) : (
                        canWrite && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            disabled={item.estimated_value == null || busyId === item.id}
                            onClick={() => addToTable(item)}
                            aria-label="Adicionar à tabela"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </Button>
                        )
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(item.id)} aria-label="Remover">
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
        {phases.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-text-muted">
            <ClipboardCheck className="h-6 w-6" />
            Checklist vazio.
          </Card>
        )}
      </div>
    </div>
  );
}
