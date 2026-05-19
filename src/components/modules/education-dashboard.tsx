"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { GraduationCap, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sparkline } from "@/components/charts/sparkline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";

interface Module {
  id: string;
  name: string;
}
interface Item {
  id: string;
  title: string;
  provider: string | null;
  student: string | null;
  monthly_cost: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface AiOption {
  title: string;
  provider: string;
  type: string;
  monthly_cost: number | null | undefined;
  pros: string;
  cons: string | null | undefined;
}

export function EducationDashboard({
  module,
  items: initial,
  canWrite,
}: {
  module: Module;
  items: Item[];
  canWrite: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Item>>({ title: "" });

  // AI
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ comparison: string; options: AiOption[] } | null>(null);

  const monthlyTotal = items.reduce((s, i) => s + Number(i.monthly_cost ?? 0), 0);
  const yearlyProjection = monthlyTotal * 12;
  const trend = Array.from({ length: 12 }, (_, i) => ({ value: monthlyTotal * (1 + i * 0.005) })); // 0.5% reajuste mensal

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

  async function askAi() {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai/edu-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: aiTopic }),
      });
      if (!res.ok) throw new Error("Falha na IA");
      const data = (await res.json()) as { comparison: string; options: AiOption[] };
      setAiResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setAiLoading(false);
    }
  }

  function saveAiOption(opt: AiOption) {
    if (!canWrite) return;
    start(async () => {
      const { data } = await supabase
        .from("education_items")
        .insert({
          module_id: module.id,
          title: opt.title,
          provider: opt.provider,
          student: null,
          monthly_cost: opt.monthly_cost ?? null,
          start_date: null,
          end_date: null,
          notes: [opt.type, opt.pros, opt.cons].filter(Boolean).join(" · "),
        })
        .select("*")
        .single();
      if (data) {
        setItems((s) => [...s, data as Item]);
        toast.success("Adicionado.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/modules" className="text-xs text-text-muted hover:text-text">
            ← Módulos
          </Link>
          <h1 className="text-2xl font-semibold sm:text-3xl">🎓 {module.name}</h1>
        </div>
      </header>

      {/* Stats com tendência */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-muted">Total mensal</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Money value={monthlyTotal} size="xl" />
            <div className="mt-2 h-10">
              <Sparkline data={trend} tone="primary" height={40} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-muted">Projeção 12 meses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Money value={yearlyProjection} size="xl" tone="muted" />
            <p className="mt-1 text-[10px] text-text-muted">soma simples sem reajuste</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-muted">Cursos ativos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="num text-3xl font-semibold">{items.length}</p>
          </CardContent>
        </Card>
      </section>

      {/* AI Comparar */}
      {canWrite && (
        <Card className="p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Comparar cursos com IA
          </p>
          <p className="mb-3 text-xs text-text-muted">
            Diga o tópico (ex: &quot;inglês infantil&quot;, &quot;programação Python&quot;) e a IA compara opções com preços de mercado.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Ex: inglês para crianças 8 anos"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />
            <Button onClick={askAi} disabled={aiLoading || !aiTopic.trim()}>
              {aiLoading ? "Comparando..." : "Comparar"}
            </Button>
          </div>

          {aiResult && (
            <div className="mt-4 space-y-2">
              <p className="text-xs italic text-text-muted">{aiResult.comparison}</p>
              <ul className="space-y-2">
                {aiResult.options.map((o, idx) => (
                  <li key={idx}>
                    <Card className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{o.title}</p>
                          <p className="text-[10px] uppercase tracking-wider text-text-muted">
                            {o.type} · {o.provider}
                          </p>
                          <p className="mt-1 text-xs">✅ {o.pros}</p>
                          {o.cons && <p className="text-xs">⚠️ {o.cons}</p>}
                        </div>
                        <div className="text-right">
                          <Money value={o.monthly_cost} size="sm" className="num" />
                          <p className="text-[10px] text-text-muted">/mês</p>
                          <Button size="sm" variant="outline" className="mt-1" onClick={() => saveAiOption(o)}>
                            <Plus className="h-3 w-3" /> Salvar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {canWrite && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Adicionar curso manualmente</p>
          <div className="grid gap-2 sm:grid-cols-6">
            <Input
              className="sm:col-span-2"
              placeholder="Curso"
              value={draft.title ?? ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Input
              placeholder="Aluno"
              value={draft.student ?? ""}
              onChange={(e) => setDraft({ ...draft, student: e.target.value })}
            />
            <Input
              placeholder="Escola"
              value={draft.provider ?? ""}
              onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Mensalidade"
              value={draft.monthly_cost ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, monthly_cost: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
            <Input
              type="date"
              value={draft.start_date ?? ""}
              onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
            />
            <Button onClick={add} disabled={pending || !draft.title} className="sm:col-span-6">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty icon={GraduationCap} title="Sem cursos" description="Adicione manualmente ou compare com IA." />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-xs text-text-muted">
                    {i.student && `${i.student} · `}
                    {i.provider}
                    {i.start_date && ` · desde ${fmtDate(i.start_date)}`}
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
