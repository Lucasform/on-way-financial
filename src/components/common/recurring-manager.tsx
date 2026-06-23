"use client";

import { Pause, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { fmtDate, todayISO } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
type TxType = "expense" | "income" | "transfer";

interface Recurring {
  id: string;
  household_id: string;
  type: TxType;
  amount: number | string;
  description: string;
  category_id: string | null;
  payment_method_id: string | null;
  notes: string | null;
  frequency: Frequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  next_run: string;
  last_run: string | null;
  active: boolean;
}

interface Props {
  householdId: string;
  userId: string;
  canWrite: boolean;
  initial: Recurring[];
  categories: { id: string; name: string; type: string }[];
  methods: { id: string; name: string }[];
}

const FREQ_LABEL: Record<Frequency, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

const TYPE_LABEL: Record<TxType, string> = {
  expense: "Despesa",
  income: "Receita",
  transfer: "Transferência",
};

export function RecurringManager({ householdId, userId, canWrite, initial, categories, methods }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState<Recurring[]>(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState({
    description: "",
    type: "expense" as TxType,
    amount: "",
    category_id: "",
    payment_method_id: "",
    frequency: "monthly" as Frequency,
    next_run: todayISO(),
    end_date: "",
  });

  function create() {
    if (!canWrite) return;
    if (!draft.description.trim()) {
      toast.error("Descrição obrigatória.");
      return;
    }
    const amt = Number(draft.amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    start(async () => {
      const next = parseISODateOnly(draft.next_run);
      const payload = {
        household_id: householdId,
        type: draft.type,
        amount: amt,
        description: draft.description.trim(),
        category_id: draft.category_id || null,
        payment_method_id: draft.payment_method_id || null,
        frequency: draft.frequency,
        day_of_month: draft.frequency === "monthly" ? next.getDate() : null,
        day_of_week: draft.frequency === "weekly" ? next.getDay() : null,
        start_date: draft.next_run,
        end_date: draft.end_date || null,
        next_run: draft.next_run,
        active: true,
        created_by: userId,
      };
      const { data, error } = await supabase
        .from("recurring_transactions")
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        toast.error(`Erro: ${error.message}`);
        return;
      }
      setItems([data as Recurring, ...items]);
      setDraft({
        description: "",
        type: "expense",
        amount: "",
        category_id: "",
        payment_method_id: "",
        frequency: "monthly",
        next_run: todayISO(),
        end_date: "",
      });
      toast.success("Recorrência criada!");
    });
  }

  function toggleActive(r: Recurring) {
    if (!canWrite) return;
    start(async () => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ active: !r.active })
        .eq("id", r.id);
      if (error) {
        toast.error(`Erro: ${error.message}`);
        return;
      }
      setItems(items.map((it) => (it.id === r.id ? { ...it, active: !r.active } : it)));
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    if (!confirm("Excluir esta recorrência? Os lançamentos já criados continuam.")) return;
    start(async () => {
      const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
      if (error) {
        toast.error(`Erro: ${error.message}`);
        return;
      }
      setItems(items.filter((it) => it.id !== id));
      toast.success("Recorrência excluída.");
    });
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Plus className="h-4 w-4" /> Nova recorrência
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="rec-desc">Descrição</Label>
              <Input
                id="rec-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Ex: Salário, Netflix, Aluguel..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Valor (R$)</Label>
              <Input
                id="rec-amount"
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-type">Tipo</Label>
              <select
                id="rec-type"
                className="h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as TxType })}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-freq">Frequência</Label>
              <select
                id="rec-freq"
                className="h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                value={draft.frequency}
                onChange={(e) => setDraft({ ...draft, frequency: e.target.value as Frequency })}
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-next">Próximo lançamento</Label>
              <Input
                id="rec-next"
                type="date"
                value={draft.next_run}
                onChange={(e) => setDraft({ ...draft, next_run: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-cat">Categoria</Label>
              <select
                id="rec-cat"
                className="h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                value={draft.category_id}
                onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-pay">Pagamento</Label>
              <select
                id="rec-pay"
                className="h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                value={draft.payment_method_id}
                onChange={(e) => setDraft({ ...draft, payment_method_id: e.target.value })}
              >
                <option value="">—</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-end">Termina em (opcional)</Label>
              <Input
                id="rec-end"
                type="date"
                value={draft.end_date}
                onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={create} disabled={pending}>
              {pending ? "Criando..." : "Criar recorrência"}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="p-6 text-center text-sm text-text-muted">
            <Repeat className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Nenhuma recorrência ainda. Cadastre acima.
          </Card>
        ) : (
          items.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-medium">{r.description}</h3>
                  <Badge variant={r.active ? "default" : "outline"}>
                    {r.active ? "Ativa" : "Pausada"}
                  </Badge>
                  <Badge variant="outline">{FREQ_LABEL[r.frequency]}</Badge>
                  <Badge variant="outline">{TYPE_LABEL[r.type]}</Badge>
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  <Money value={Number(r.amount)} className="font-semibold" /> · próximo: {fmtDate(r.next_run)}
                  {r.last_run && <> · último: {fmtDate(r.last_run)}</>}
                  {r.end_date && <> · termina: {fmtDate(r.end_date)}</>}
                </p>
              </div>
              {canWrite && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(r)}
                    disabled={pending}
                    aria-label={r.active ? "Pausar" : "Retomar"}
                  >
                    {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(r.id)}
                    disabled={pending}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function parseISODateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

