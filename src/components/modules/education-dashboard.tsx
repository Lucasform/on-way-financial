"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { GraduationCap, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";

interface Module { id: string; name: string }
interface Item {
  id: string;
  title: string;
  provider: string | null;
  student: string | null;
  monthly_cost: number | null;
  start_date: string | null;
  end_date: string | null;
}

export function EducationDashboard({ module, items: initial, canWrite }: { module: Module; items: Item[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Item>>({ title: "" });

  const monthlyTotal = items.reduce((s, i) => s + Number(i.monthly_cost ?? 0), 0);
  const yearlyProjection = monthlyTotal * 12;

  function add() {
    if (!canWrite || !draft.title) return;
    start(async () => {
      const { data } = await supabase
        .from("education_items")
        .insert({
          module_id: module.id,
          title: draft.title!,
          provider: draft.provider ?? null,
          student: draft.student ?? null,
          monthly_cost: draft.monthly_cost ?? null,
          start_date: draft.start_date ?? null,
          end_date: draft.end_date ?? null,
        })
        .select("*")
        .single();
      if (data) setItems((s) => [...s, data as Item]);
      setDraft({ title: "" });
    });
  }
  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("education_items").delete().eq("id", id);
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/modules" className="text-xs text-text-muted hover:text-text">← Módulos</Link>
        <h1 className="text-2xl font-semibold">🎓 {module.name}</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Total mensal</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={monthlyTotal} size="xl" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Projeção 12 meses</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={yearlyProjection} size="xl" tone="muted" /></CardContent>
        </Card>
      </section>

      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-6">
            <Input className="sm:col-span-2" placeholder="Curso" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Input placeholder="Aluno" value={draft.student ?? ""} onChange={(e) => setDraft({ ...draft, student: e.target.value })} />
            <Input placeholder="Escola/Provedor" value={draft.provider ?? ""} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Mensalidade" value={draft.monthly_cost ?? ""} onChange={(e) => setDraft({ ...draft, monthly_cost: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input type="date" value={draft.start_date ?? ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
            <Button onClick={add} disabled={pending || !draft.title} className="sm:col-span-6"><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty icon={GraduationCap} title="Sem cursos" description="Adicione curso, escola ou mensalidade." />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-xs text-text-muted">
                    {i.student && `${i.student} · `}{i.provider}{i.start_date && ` · desde ${fmtDate(i.start_date)}`}
                  </p>
                </div>
                <Money value={i.monthly_cost} size="sm" />
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
