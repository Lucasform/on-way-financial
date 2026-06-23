"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl, pct } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  color: string | null;
};

export function GoalsClient({ householdId, goals }: { householdId: string; goals: Goal[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", target: "", date: "" });

  async function add() {
    const target = parseFloat(form.target.replace(",", "."));
    if (!form.name.trim() || !target) return;
    setSaving(true);
    await supabase.from("goals").insert({
      household_id: householdId,
      name: form.name,
      target_amount: target,
      target_date: form.date || null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", target: "", date: "" });
    router.refresh();
  }

  async function contribute(g: Goal) {
    const v = prompt(`Aporte para "${g.name}" (R$):`);
    if (!v) return;
    const add = parseFloat(v.replace(",", "."));
    if (!add) return;
    await supabase.from("goals").update({ saved_amount: Number(g.saved_amount) + add }).eq("id", g.id);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir meta?")) return;
    await supabase.from("goals").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Target className="h-6 w-6" />
            </div>
            <p className="text-sm text-fg-soft">Crie metas de economia e acompanhe os aportes.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const p = Number(g.target_amount) > 0 ? (Number(g.saved_amount) / Number(g.target_amount)) * 100 : 0;
            return (
              <Card key={g.id}>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{g.name}</p>
                  <button onClick={() => remove(g.id)} className="text-fg-soft hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="num mt-2 text-lg font-semibold">{brl(Number(g.saved_amount))}</p>
                <p className="text-xs text-muted">de {brl(Number(g.target_amount))}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(p, 100)}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {pct(p)}
                    {g.target_date ? ` · até ${new Date(g.target_date).toLocaleDateString("pt-BR")}` : ""}
                  </span>
                  <Button onClick={() => contribute(g)} size="sm" variant="outline">
                    Aportar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova meta">
        <div className="space-y-3">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Reserva de emergência" />
          </Field>
          <Field label="Valor alvo (R$)">
            <Input inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="0,00" />
          </Field>
          <Field label="Data alvo (opcional)">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Button onClick={add} loading={saving} className="w-full">
            Criar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
