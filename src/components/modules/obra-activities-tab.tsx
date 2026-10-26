"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarClock, Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { fmtDate, todayISO } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { ObraChecklistTab, type ChecklistItem } from "@/components/modules/obra-checklist-tab";
import { cn } from "@/lib/utils";

export interface Activity {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  status: string;
  done_at: string | null;
  assignee: string | null;
}

interface Props {
  moduleId: string;
  initialActivities: Activity[];
  initialChecklist: ChecklistItem[];
  memberNames: string[];
  canWrite: boolean;
}

const EMPTY_DRAFT = { title: "", due_date: "", notes: "", assignee: "" };

export function ObraActivitiesTab({ moduleId, initialActivities, initialChecklist, memberNames, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [subTab, setSubTab] = useState<"tarefas" | "referencia">("tarefas");
  const [activities, setActivities] = useState(initialActivities);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT);

  const assigneeOptions = useMemo(() => {
    const names = [...memberNames, ...activities.map((a) => a.assignee ?? "")].map((n) => n.trim()).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [memberNames, activities]);
  const [pending, start] = useTransition();
  const { confirm, ConfirmDialog } = useConfirm();

  const today = todayISO();

  const { overdue, upcoming, noDate, done } = useMemo(() => {
    const open = activities.filter((a) => a.status !== "feito");
    const overdue = open.filter((a) => a.due_date && a.due_date < today).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
    const upcoming = open.filter((a) => a.due_date && a.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
    const noDate = open.filter((a) => !a.due_date);
    const done = activities.filter((a) => a.status === "feito").sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
    return { overdue, upcoming, noDate, done };
  }, [activities, today]);

  async function addActivity(title: string, due_date?: string | null) {
    if (!canWrite || !title.trim()) return;
    const { data, error } = await supabase
      .from("obra_activities")
      .insert({ module_id: moduleId, title: title.trim(), due_date: due_date || null })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Falha ao criar tarefa.");
      return;
    }
    setActivities((s) => [...s, data as Activity]);
    toast.success("Tarefa criada.");
  }

  function submitAdd() {
    if (!draft.title.trim()) return;
    start(async () => {
      const { data, error } = await supabase
        .from("obra_activities")
        .insert({
          module_id: moduleId,
          title: draft.title.trim(),
          due_date: draft.due_date || null,
          notes: draft.notes.trim() || null,
          assignee: draft.assignee.trim() || null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao criar tarefa.");
        return;
      }
      setActivities((s) => [...s, data as Activity]);
      setDraft(EMPTY_DRAFT);
      setShowAdd(false);
    });
  }

  function toggleDone(a: Activity) {
    if (!canWrite) return;
    const nowDone = a.status !== "feito";
    const nextStatus = nowDone ? "feito" : "pendente";
    const nextDoneAt = nowDone ? today : null;
    setActivities((s) => s.map((x) => (x.id === a.id ? { ...x, status: nextStatus, done_at: nextDoneAt } : x)));
    start(async () => {
      const { error } = await supabase
        .from("obra_activities")
        .update({ status: nextStatus, done_at: nextDoneAt })
        .eq("id", a.id);
      if (error) {
        setActivities((s) => s.map((x) => (x.id === a.id ? { ...x, status: a.status, done_at: a.done_at } : x)));
        toast.error("Falha ao atualizar.");
      }
    });
  }

  async function removeActivity(a: Activity) {
    if (!canWrite) return;
    if (!(await confirm(`Apagar "${a.title}"?`, { danger: true }))) return;
    setActivities((s) => s.filter((x) => x.id !== a.id));
    const { error } = await supabase.from("obra_activities").delete().eq("id", a.id);
    if (error) toast.error("Falha ao apagar.");
  }

  function openEdit(a: Activity) {
    if (!canWrite) return;
    if (editingId === a.id) {
      setEditingId(null);
      return;
    }
    setEditDraft({ title: a.title, due_date: a.due_date ?? "", notes: a.notes ?? "", assignee: a.assignee ?? "" });
    setEditingId(a.id);
  }

  function saveEdit(id: string) {
    start(async () => {
      const payload = {
        title: editDraft.title.trim(),
        due_date: editDraft.due_date || null,
        notes: editDraft.notes.trim() || null,
        assignee: editDraft.assignee.trim() || null,
      };
      const { error } = await supabase.from("obra_activities").update(payload).eq("id", id);
      if (error) {
        toast.error("Falha ao salvar.");
        return;
      }
      setActivities((s) => s.map((x) => (x.id === id ? { ...x, ...payload } : x)));
      setEditingId(null);
    });
  }

  function Row({ a }: { a: Activity }) {
    const checked = a.status === "feito";
    const overdueNow = !checked && a.due_date && a.due_date < today;
    const isEditing = editingId === a.id;
    return (
      <div>
        <li className="flex items-center gap-2 p-3 text-sm">
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => toggleDone(a)}
            aria-label={checked ? "Marcar como pendente" : "Marcar como feito"}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
              checked ? "border-success bg-success text-white" : "border-border",
            )}
          >
            {checked && <Check className="h-3.5 w-3.5" />}
          </button>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEdit(a)}>
            <p className={cn("truncate", checked ? "text-text-muted line-through" : "")}>{a.title}</p>
            {a.notes && <p className="truncate text-xs text-text-muted">{a.notes}</p>}
          </div>
          {a.assignee && (
            <span
              className="flex max-w-[9rem] shrink-0 items-center gap-1.5 rounded-full bg-primary/10 py-0.5 pl-0.5 pr-2 text-xs font-medium text-primary"
              title={`Responsável: ${a.assignee}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold uppercase text-white">
                {a.assignee.trim().charAt(0)}
              </span>
              <span className="truncate">{a.assignee}</span>
            </span>
          )}
          {a.due_date && (
            <span className={cn("shrink-0 text-xs", overdueNow ? "font-medium text-danger" : "text-text-muted")}>
              {fmtDate(a.due_date, "dd/MM/yyyy")}
            </span>
          )}
          {canWrite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                removeActivity(a);
              }}
              aria-label="Apagar"
            >
              <Trash2 className="h-3.5 w-3.5 text-danger" />
            </Button>
          )}
        </li>
        {isEditing && (
          <div className="grid gap-2 border-t border-border bg-bg-elev-2 p-3 sm:grid-cols-5">
            <Input
              value={editDraft.title}
              onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
              placeholder="O que precisa fechar"
              className="sm:col-span-2"
            />
            <Input
              type="date"
              value={editDraft.due_date}
              onChange={(e) => setEditDraft({ ...editDraft, due_date: e.target.value })}
            />
            <Input
              value={editDraft.assignee}
              onChange={(e) => setEditDraft({ ...editDraft, assignee: e.target.value })}
              placeholder="Responsável"
              list="activity-assignees"
            />
            <Input
              value={editDraft.notes}
              onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
              placeholder="Nota (opcional)"
            />
            <div className="flex justify-end gap-2 sm:col-span-5">
              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button size="sm" disabled={pending || !editDraft.title.trim()} onClick={() => saveEdit(a.id)}>Salvar</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function Section({ title, rows, muted }: { title: string; rows: Activity[]; muted?: boolean }) {
    if (rows.length === 0) return null;
    return (
      <div>
        <p className={cn("mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide", muted ? "text-text-muted" : "text-text")}>
          {title} ({rows.length})
        </p>
        <Card className="divide-y divide-border overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {rows.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ConfirmDialog}
      <datalist id="activity-assignees">
        {assigneeOptions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSubTab("tarefas")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            subTab === "tarefas" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:bg-bg-elev-2",
          )}
        >
          Tarefas
        </button>
        <button
          type="button"
          onClick={() => setSubTab("referencia")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            subTab === "referencia" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:bg-bg-elev-2",
          )}
        >
          Referência
        </button>
      </div>

      {subTab === "tarefas" ? (
        <div className="space-y-4">
          {canWrite && !showAdd && (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" /> Nova tarefa
            </Button>
          )}
          {canWrite && showAdd && (
            <Card className="p-3">
              <div className="grid gap-2 sm:grid-cols-5">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="O que precisa fechar (ex: pedir água)"
                  className="sm:col-span-2"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && submitAdd()}
                />
                <Input
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                />
                <Input
                  value={draft.assignee}
                  onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
                  placeholder="Responsável"
                  list="activity-assignees"
                />
                <Input
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Nota (opcional)"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
                <Button size="sm" disabled={pending || !draft.title.trim()} onClick={submitAdd}>Salvar</Button>
              </div>
            </Card>
          )}

          <Section title="Atrasadas" rows={overdue} />
          <Section title="Próximas" rows={upcoming} />
          <Section title="Sem data" rows={noDate} muted />
          <Section title="Concluídas" rows={done} muted />

          {activities.length === 0 && (
            <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-text-muted">
              <ListTodo className="h-6 w-6" />
              Nenhuma tarefa ainda. Anote o que precisa fechar.
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 px-1 text-xs text-text-muted">
            <CalendarClock className="h-3.5 w-3.5" /> Lembrete do que existe. Clique na seta pra virar tarefa real, com data.
          </p>
          <ObraChecklistTab moduleId={moduleId} initial={initialChecklist} canWrite={canWrite} onPromote={addActivity} />
        </div>
      )}
    </div>
  );
}
