"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Repeat, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";

type Rule = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  frequency: string;
  day_of_month: number | null;
  next_run: string;
  active: boolean;
  category_id: string | null;
};
type Cat = { id: string; name: string; kind: string };

const FREQ: Record<string, string> = { weekly: "semanal", monthly: "mensal", yearly: "anual" };

function advance(date: string, freq: string): string {
  const d = new Date(date);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function RecurringClient({
  householdId,
  rules,
  categories,
}: {
  householdId: string;
  rules: Rule[];
  categories: Cat[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    frequency: "monthly",
    next_run: new Date().toISOString().slice(0, 10),
    category_id: "",
  });

  async function add() {
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!amount) return;
    setSaving(true);
    await supabase.from("recurring_rules").insert({
      household_id: householdId,
      type: form.type,
      amount,
      description: form.description || null,
      frequency: form.frequency,
      next_run: form.next_run,
      category_id: form.category_id || null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ ...form, amount: "", description: "" });
    router.refresh();
  }

  async function toggle(r: Rule) {
    await supabase.from("recurring_rules").update({ active: !r.active }).eq("id", r.id);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir recorrência?")) return;
    await supabase.from("recurring_rules").delete().eq("id", id);
    router.refresh();
  }

  // gera o lançamento agora e avança a próxima data
  async function run(r: Rule) {
    await supabase.from("transactions").insert({
      household_id: householdId,
      type: r.type,
      amount: r.amount,
      description: r.description,
      category_id: r.category_id,
      occurred_on: r.next_run,
      source: "recurring",
    });
    await supabase
      .from("recurring_rules")
      .update({ next_run: advance(r.next_run, r.frequency) })
      .eq("id", r.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova recorrência
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Repeat className="h-6 w-6" />
            </div>
            <p className="text-sm text-fg-soft">Cadastre contas fixas (aluguel, salário, assinaturas).</p>
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.description || "—"}</p>
                  <p className="text-xs text-muted">
                    {FREQ[r.frequency]} · próx. {new Date(r.next_run).toLocaleDateString("pt-BR")}
                    {!r.active && " · pausada"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`num text-sm font-semibold ${r.type === "income" ? "text-success" : "text-danger"}`}>
                    {r.type === "income" ? "+" : "-"}
                    {brl(Number(r.amount))}
                  </span>
                  <button onClick={() => run(r)} title="Gerar lançamento agora" className="text-fg-soft hover:text-brand">
                    <Zap className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggle(r)} className={`text-xs ${r.active ? "text-fg-soft" : "text-success"}`}>
                    {r.active ? "pausar" : "ativar"}
                  </button>
                  <button onClick={() => remove(r.id)} className="text-fg-soft hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova recorrência">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setForm({ ...form, type: "expense" })} className={`rounded-xl border px-3 py-2 text-sm font-medium ${form.type === "expense" ? "border-danger bg-danger/10 text-danger" : "border-border"}`}>
              Saída
            </button>
            <button onClick={() => setForm({ ...form, type: "income" })} className={`rounded-xl border px-3 py-2 text-sm font-medium ${form.type === "income" ? "border-success bg-success/10 text-success" : "border-border"}`}>
              Entrada
            </button>
          </div>
          <Field label="Valor (R$)">
            <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
          </Field>
          <Field label="Descrição">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Aluguel, Netflix..." />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Frequência">
              <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </Select>
            </Field>
            <Field label="Próxima data">
              <Input type="date" value={form.next_run} onChange={(e) => setForm({ ...form, next_run: e.target.value })} />
            </Field>
          </div>
          <Field label="Categoria">
            <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">—</option>
              {categories.filter((c) => c.kind === form.type).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={add} loading={saving} className="w-full">
            Criar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
