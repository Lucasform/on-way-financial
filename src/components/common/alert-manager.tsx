"use client";

import { useState, useTransition } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Alert {
  id: string;
  kind: string;
  name: string;
  config: Record<string, unknown> | null;
  channels: unknown;
  target_member_ids: string[];
  frequency: string;
  active: boolean;
  last_triggered_at: string | null;
}

interface Props {
  householdId: string;
  userId: string;
  canWrite: boolean;
  initial: Alert[];
  categories: { id: string; name: string }[];
  members: { id: string; display_name: string | null; whatsapp_phone: string | null }[];
}

const KIND_LABELS: Record<string, string> = {
  budget_exceeded: "Estouro de orçamento (categoria/mês)",
  large_expense: "Despesa grande",
  invoice_closing: "Fechamento de fatura",
  recurring_due: "Recorrente vencendo",
  goal_progress: "Progresso de meta",
  custom: "Personalizado",
};

export function AlertManager({ householdId, userId, canWrite, initial, categories, members }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState({
    name: "",
    kind: "large_expense",
    threshold: 200,
    category_id: "",
    member_id: "",
    frequency: "immediate",
  });

  function create() {
    if (!canWrite || !draft.name.trim()) return;
    start(async () => {
      const config: Record<string, unknown> = {};
      if (draft.kind === "large_expense") config.threshold = draft.threshold;
      if (draft.kind === "budget_exceeded") {
        config.category_id = draft.category_id;
        config.limit = draft.threshold;
      }
      const { data, error } = await supabase
        .from("alerts")
        .insert({
          household_id: householdId,
          kind: draft.kind,
          name: draft.name,
          config,
          target_member_ids: draft.member_id ? [draft.member_id] : [],
          frequency: draft.frequency,
          channels: ["whatsapp"],
          active: true,
          created_by: userId,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao criar.");
        return;
      }
      setItems((s) => [data as Alert, ...s]);
      toast.success("Alerta criado.");
    });
  }

  function toggle(id: string, active: boolean) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("alerts").update({ active }).eq("id", id);
      setItems((s) => s.map((a) => (a.id === id ? { ...a, active } : a)));
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("alerts").delete().eq("id", id);
      setItems((s) => s.filter((a) => a.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="aname">Nome do alerta</Label>
              <Input
                id="aname"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Mercado > R$ 1.500/mês"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="akind">Tipo</Label>
              <select
                id="akind"
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="thr">Limite (R$)</Label>
              <Input
                id="thr"
                type="number"
                step="0.01"
                value={draft.threshold}
                onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })}
              />
            </div>
            {draft.kind === "budget_exceeded" && (
              <div className="space-y-1">
                <Label htmlFor="acat">Categoria</Label>
                <select
                  id="acat"
                  value={draft.category_id}
                  onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="amem">Avisar (membro)</Label>
              <select
                id="amem"
                value={draft.member_id}
                onChange={(e) => setDraft({ ...draft, member_id: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                <option value="">—</option>
                {members
                  .filter((m) => m.whatsapp_phone)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name ?? m.whatsapp_phone}
                    </option>
                  ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button onClick={create} disabled={pending || !draft.name.trim()}>
                <Plus className="h-4 w-4" /> Criar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id}>
            <Card className="flex items-center gap-3 p-4">
              <Bell className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-text-muted">
                  {KIND_LABELS[a.kind] ?? a.kind} ·{" "}
                  {a.config && typeof (a.config as { threshold?: number }).threshold === "number" && (
                    <Money value={(a.config as { threshold?: number }).threshold ?? 0} size="sm" tone="muted" />
                  )}
                </p>
              </div>
              <Badge variant={a.active ? "success" : "secondary"}>{a.active ? "ativo" : "desligado"}</Badge>
              {canWrite && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => toggle(a.id, !a.active)}>
                    {a.active ? "Pausar" : "Ativar"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
