"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plane, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Empty } from "@/components/ui/empty";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";
import { percent } from "@/lib/money";

interface Module {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}
interface Item {
  id: string;
  module_id: string;
  kind: string;
  title: string;
  planned_amount: number | null;
  actual_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  booking_ref: string | null;
}
interface Tx { id: string; amount: number | string; description: string | null; occurred_at: string }

const KINDS = [
  { key: "flight", label: "✈️ Voo" },
  { key: "hotel", label: "🏨 Hotel" },
  { key: "transport", label: "🚗 Transporte" },
  { key: "food", label: "🍽️ Alimentação" },
  { key: "tour", label: "🎡 Tour" },
  { key: "other", label: "📌 Outro" },
];

export function TravelDashboard({
  module,
  items: initial,
  transactions,
  canWrite,
}: {
  module: Module;
  items: Item[];
  transactions: Tx[];
  canWrite: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Item>>({ kind: "flight", title: "" });

  const totalSpent = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const plannedTotal = items.reduce((s, i) => s + Number(i.planned_amount ?? 0), 0);
  const pct = module.budget ? percent(totalSpent, Number(module.budget)) : 0;

  function add() {
    if (!canWrite || !draft.title) return;
    start(async () => {
      const { data } = await supabase
        .from("travel_items")
        .insert({
          module_id: module.id,
          kind: draft.kind ?? "other",
          title: draft.title!,
          planned_amount: draft.planned_amount ?? null,
          actual_amount: draft.actual_amount ?? null,
          start_date: draft.start_date ?? null,
          end_date: draft.end_date ?? null,
          booking_ref: draft.booking_ref ?? null,
        })
        .select("*")
        .single();
      if (data) setItems((s) => [...s, data as Item]);
      setDraft({ kind: "flight", title: "" });
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("travel_items").delete().eq("id", id);
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/modules" className="text-xs text-text-muted hover:text-text">← Módulos</Link>
        <h1 className="text-2xl font-semibold">✈️ {module.name}</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Realizado" value={<Money value={totalSpent} size="xl" />} />
        <Stat label="Planejado" value={<Money value={plannedTotal} size="xl" tone="muted" />} />
        <Stat label="Orçamento" value={<Money value={module.budget} size="xl" tone="muted" />} />
        <Stat
          label="% usado"
          value={
            <div className="space-y-2">
              <p className="font-mono text-2xl">{pct.toFixed(1)}%</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-elev-2">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </div>
          }
        />
      </section>

      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-6">
            <select
              value={draft.kind ?? "flight"}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
              className="h-10 rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            <Input className="sm:col-span-2" placeholder="Reserva (ex.: GRU→LIS)" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Planejado" value={draft.planned_amount ?? ""} onChange={(e) => setDraft({ ...draft, planned_amount: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input type="date" value={draft.start_date ?? ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
            <Button onClick={add} disabled={pending || !draft.title}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty icon={Plane} title="Sem itens de viagem" description="Adicione voos, hotéis e tours." />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center gap-3 p-4">
                <Badge variant="secondary">{KINDS.find((k) => k.key === i.kind)?.label ?? i.kind}</Badge>
                <div className="flex-1">
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-text-muted">
                    {i.start_date && fmtDate(i.start_date)}{i.end_date && ` → ${fmtDate(i.end_date)}`}
                    {i.booking_ref && ` · ${i.booking_ref}`}
                  </p>
                </div>
                <Money value={i.planned_amount} size="sm" />
                {canWrite && (
                  <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">{label}</CardTitle></CardHeader>
      <CardContent className="pt-0">{value}</CardContent>
    </Card>
  );
}
