"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Banknote,
  BookCheck,
  Briefcase,
  Calendar,
  CalendarCheck,
  CheckSquare,
  FileText,
  Laptop,
  Plus,
  Syringe,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";

export interface TravelCheckItem {
  id: string;
  module_id: string;
  category: string;
  item: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  position: number;
}

const CATEGORIES: { value: string; label: string; icon: React.ElementType; color: string }[] = [
  { value: "documents", label: "Documentos", icon: FileText, color: "#3B82F6" },
  { value: "vaccines", label: "Vacinas", icon: Syringe, color: "#EF4444" },
  { value: "luggage", label: "Bagagem", icon: Briefcase, color: "#F59E0B" },
  { value: "banking", label: "Banco / câmbio", icon: Banknote, color: "#22C55E" },
  { value: "electronics", label: "Eletrônicos", icon: Laptop, color: "#7C8CFF" },
  { value: "reservations", label: "Reservas", icon: CalendarCheck, color: "#A855F7" },
  { value: "other", label: "Outros", icon: BookCheck, color: "#9CA3AF" },
];

const DEFAULTS_BY_CAT: Record<string, string[]> = {
  documents: ["Passaporte válido (6+ meses)", "Visto", "Seguro viagem", "CNH internacional", "Cópia digital dos docs"],
  vaccines: ["Febre amarela", "COVID-19 reforço", "Certificado de vacinação"],
  luggage: ["Adaptador de tomada", "Carregador USB-C", "Roupas (lista por dia)", "Kit higiene", "Remédios básicos"],
  banking: ["Cartão internacional desbloqueado", "Avisar o banco da viagem", "Dinheiro em espécie (moeda local)"],
  electronics: ["Celular com chip eSIM", "Power bank", "Câmera + cartão SD"],
  reservations: ["Confirmar voo", "Confirmar hotel", "Reservar restaurantes", "Comprar ingressos atrações"],
  other: [],
};

interface Props {
  moduleId: string;
  initial: TravelCheckItem[];
  canWrite: boolean;
}

export function TravelChecklistTab({ moduleId, initial, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<{ category: string; item: string; due_date: string }>({
    category: "documents",
    item: "",
    due_date: "",
  });

  const grouped = useMemo(() => {
    const map = new Map<string, TravelCheckItem[]>();
    for (const c of CATEGORIES) map.set(c.value, []);
    for (const i of items) {
      if (!map.has(i.category)) map.set(i.category, []);
      map.get(i.category)!.push(i);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    return { total, done, pct: total ? (done / total) * 100 : 0 };
  }, [items]);

  function add() {
    if (!canWrite || !draft.item.trim()) return;
    start(async () => {
      const { data } = await supabase
        .from("travel_checklist")
        .insert({
          module_id: moduleId,
          category: draft.category,
          item: draft.item.trim(),
          status: "pending",
          due_date: draft.due_date || null,
          notes: null,
          position: items.length,
        })
        .select("*")
        .single();
      if (data) setItems((s) => [...s, data as TravelCheckItem]);
      setDraft({ category: draft.category, item: "", due_date: "" });
    });
  }

  function toggle(id: string) {
    if (!canWrite) return;
    const cur = items.find((i) => i.id === id);
    if (!cur) return;
    const next = cur.status === "done" ? "pending" : "done";
    start(async () => {
      await supabase.from("travel_checklist").update({ status: next }).eq("id", id);
      setItems((s) => s.map((i) => (i.id === id ? { ...i, status: next } : i)));
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("travel_checklist").delete().eq("id", id);
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  async function seedDefaults() {
    if (!canWrite) return;
    const toAdd: Omit<TravelCheckItem, "id">[] = [];
    let pos = items.length;
    for (const cat of CATEGORIES) {
      const defaults = DEFAULTS_BY_CAT[cat.value] ?? [];
      for (const def of defaults) {
        toAdd.push({
          module_id: moduleId,
          category: cat.value,
          item: def,
          status: "pending",
          due_date: null,
          notes: null,
          position: pos++,
        });
      }
    }
    if (toAdd.length === 0) return;
    start(async () => {
      const { data } = await supabase.from("travel_checklist").insert(toAdd).select("*");
      if (data) setItems((s) => [...s, ...(data as TravelCheckItem[])]);
    });
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Checklist de preparação</span>
          <span className="text-text-muted num">
            {stats.done}/{stats.total} concluídos
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-elev-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
      </Card>

      {canWrite && items.length === 0 && (
        <div className="surface flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-text-muted">
            Quer começar com uma lista pronta de itens comuns de viagem internacional?
          </p>
          <Button onClick={seedDefaults} disabled={pending}>
            Adicionar itens sugeridos
          </Button>
        </div>
      )}

      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-6">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="h-10 rounded-md border border-border bg-bg-elev px-3 text-sm sm:col-span-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Ex: Passaporte"
              value={draft.item}
              onChange={(e) => setDraft({ ...draft, item: e.target.value })}
              className="sm:col-span-2"
            />
            <Input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
            />
            <Button onClick={add} disabled={pending || !draft.item.trim()}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? null : (
        <div className="grid gap-3 md:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const list = grouped.get(cat.value) ?? [];
            if (list.length === 0) return null;
            const Icon = cat.icon;
            const done = list.filter((i) => i.status === "done").length;
            return (
              <Card key={cat.value} className="overflow-hidden">
                <header className="flex items-center justify-between border-b border-border bg-bg-elev-2/40 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{ background: `${cat.color}1a`, color: cat.color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-semibold">{cat.label}</span>
                  </div>
                  <Badge variant="secondary">
                    {done}/{list.length}
                  </Badge>
                </header>
                <ul className="divide-y divide-border">
                  {list.map((i) => {
                    const isDone = i.status === "done";
                    return (
                      <li key={i.id} className={"flex items-center gap-3 px-4 py-2 " + (isDone ? "opacity-60" : "")}>
                        <button
                          type="button"
                          onClick={() => toggle(i.id)}
                          aria-label={isDone ? "Desmarcar" : "Marcar feito"}
                          disabled={!canWrite}
                          className={
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors " +
                            (isDone
                              ? "border-success bg-success/15 text-success"
                              : "border-border hover:border-primary hover:bg-primary/10")
                          }
                        >
                          {isDone && <CheckSquare className="h-3.5 w-3.5" />}
                        </button>
                        <div className="flex-1 text-sm">
                          <p className={isDone ? "line-through" : ""}>{i.item}</p>
                          {i.due_date && (
                            <p className="text-[10px] text-text-muted">
                              <Calendar className="mr-1 inline h-2.5 w-2.5" />
                              até {fmtDate(i.due_date)}
                            </p>
                          )}
                        </div>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => remove(i.id)}
                            className="text-text-muted hover:text-danger"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {items.length === 0 && !canWrite && (
        <Empty title="Sem itens no checklist" description="Espere o admin da família adicionar." />
      )}
    </div>
  );
}
