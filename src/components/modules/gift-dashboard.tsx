"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CalendarHeart, Check, Gift, Plus, Sparkles, Trash2 } from "lucide-react";
import { addDays, differenceInDays, format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Module {
  id: string;
  name: string;
}
interface Item {
  id: string;
  recipient: string;
  occasion: string | null;
  occasion_date: string | null;
  idea: string | null;
  budget: number | null;
  bought: boolean;
  notes: string | null;
}

interface AiIdea {
  idea: string;
  why: string;
  approx_price: number | null;
  where_to_buy: string | null;
}

export function GiftDashboard({
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
  const [draft, setDraft] = useState<Partial<Item>>({ recipient: "" });

  // AI state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ recipient: "", age: "", occasion: "", interests: "", budget: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<AiIdea[]>([]);

  function add() {
    if (!canWrite || !draft.recipient) return;
    start(async () => {
      const { data } = await supabase
        .from("gift_items")
        .insert({
          module_id: module.id,
          recipient: draft.recipient!,
          occasion: draft.occasion ?? null,
          occasion_date: draft.occasion_date ?? null,
          idea: draft.idea ?? null,
          budget: draft.budget ?? null,
          bought: false,
        })
        .select("*")
        .single();
      if (data) setItems((s) => [...s, data as Item]);
      setDraft({ recipient: "" });
    });
  }

  function toggle(id: string, bought: boolean) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("gift_items").update({ bought }).eq("id", id);
      setItems((s) => s.map((i) => (i.id === id ? { ...i, bought } : i)));
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("gift_items").delete().eq("id", id);
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  async function askAi() {
    if (!aiForm.recipient.trim()) return;
    setAiLoading(true);
    setAiIdeas([]);
    try {
      const res = await fetch("/api/ai/gift-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: aiForm.recipient,
          age: aiForm.age ? Number(aiForm.age) : undefined,
          occasion: aiForm.occasion || undefined,
          interests: aiForm.interests || undefined,
          budget: aiForm.budget ? Number(aiForm.budget) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Falha na IA");
      const data = (await res.json()) as { ideas: AiIdea[] };
      setAiIdeas(data.ideas ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  }

  function saveAiIdea(idea: AiIdea) {
    if (!canWrite) return;
    start(async () => {
      const { data } = await supabase
        .from("gift_items")
        .insert({
          module_id: module.id,
          recipient: aiForm.recipient,
          occasion: aiForm.occasion || null,
          idea: idea.idea,
          budget: idea.approx_price ?? null,
          bought: false,
          notes: [idea.why, idea.where_to_buy && `Onde: ${idea.where_to_buy}`].filter(Boolean).join(" · "),
        })
        .select("*")
        .single();
      if (data) {
        setItems((s) => [...s, data as Item]);
        toast.success("Ideia salva.");
      }
    });
  }

  // Calendar: próximos aniversários
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return items
      .filter((i) => i.occasion_date)
      .map((i) => {
        // Sem ano, ou no passado: avança pro próximo ano
        const raw = parseISO(i.occasion_date!);
        const candidate = new Date(today.getFullYear(), raw.getMonth(), raw.getDate());
        const next = candidate < today ? addDays(candidate, 365) : candidate;
        const days = differenceInDays(next, today);
        return { item: i, next, days };
      })
      .sort((a, b) => a.days - b.days);
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/modules" className="text-xs text-text-muted hover:text-text">
            ← Módulos
          </Link>
          <h1 className="text-2xl font-semibold sm:text-3xl">🎁 {module.name}</h1>
        </div>
        {canWrite && (
          <Button onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> Sugerir presentes com IA
          </Button>
        )}
      </header>

      {aiOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setAiOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Sugerir presentes</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Para quem (nome)"
                value={aiForm.recipient}
                onChange={(e) => setAiForm({ ...aiForm, recipient: e.target.value })}
              />
              <Input
                placeholder="Idade"
                type="number"
                value={aiForm.age}
                onChange={(e) => setAiForm({ ...aiForm, age: e.target.value })}
              />
              <Input
                placeholder="Ocasião (aniversário, formatura...)"
                value={aiForm.occasion}
                onChange={(e) => setAiForm({ ...aiForm, occasion: e.target.value })}
              />
              <Input
                placeholder="Orçamento (R$)"
                type="number"
                value={aiForm.budget}
                onChange={(e) => setAiForm({ ...aiForm, budget: e.target.value })}
              />
              <Input
                className="sm:col-span-2"
                placeholder="Interesses (ex: cozinha, livros, games)"
                value={aiForm.interests}
                onChange={(e) => setAiForm({ ...aiForm, interests: e.target.value })}
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAiOpen(false)} disabled={aiLoading}>
                Fechar
              </Button>
              <Button onClick={askAi} disabled={aiLoading || !aiForm.recipient.trim()}>
                {aiLoading ? "Pensando..." : aiIdeas.length > 0 ? "Gerar de novo" : "Sugerir"}
              </Button>
            </div>

            {aiIdeas.length > 0 && (
              <ul className="mt-4 space-y-2">
                {aiIdeas.map((idea, idx) => (
                  <li key={idx}>
                    <Card className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{idea.idea}</p>
                          <p className="mt-1 text-xs text-text-muted">{idea.why}</p>
                          {idea.where_to_buy && (
                            <p className="mt-1 text-[10px] text-text-muted">📍 {idea.where_to_buy}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Money value={idea.approx_price} size="sm" className="num" />
                          <Button size="sm" variant="outline" className="mt-1" onClick={() => saveAiIdea(idea)}>
                            <Plus className="h-3 w-3" /> Salvar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">📅 Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {canWrite && (
            <Card className="p-4">
              <div className="grid gap-2 sm:grid-cols-6">
                <Input
                  placeholder="Para quem"
                  value={draft.recipient ?? ""}
                  onChange={(e) => setDraft({ ...draft, recipient: e.target.value })}
                />
                <Input
                  placeholder="Ocasião"
                  value={draft.occasion ?? ""}
                  onChange={(e) => setDraft({ ...draft, occasion: e.target.value })}
                />
                <Input
                  type="date"
                  value={draft.occasion_date ?? ""}
                  onChange={(e) => setDraft({ ...draft, occasion_date: e.target.value })}
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="Ideia"
                  value={draft.idea ?? ""}
                  onChange={(e) => setDraft({ ...draft, idea: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="R$"
                  value={draft.budget ?? ""}
                  onChange={(e) => setDraft({ ...draft, budget: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <Button onClick={add} disabled={pending || !draft.recipient} className="sm:col-span-6">
                  <Plus className="h-4 w-4" /> Adicionar presente
                </Button>
              </div>
            </Card>
          )}

          {items.length === 0 ? (
            <Empty icon={Gift} title="Sem presentes" description="Anote ideias antes de esquecer 🎁" />
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((i) => (
                <li key={i.id}>
                  <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{i.recipient}</p>
                        {i.bought && <Badge variant="success">comprado</Badge>}
                      </div>
                      <p className="text-xs text-text-muted">
                        {i.occasion}
                        {i.occasion_date && ` · ${fmtDate(i.occasion_date)}`}
                        {i.idea && ` · ${i.idea}`}
                      </p>
                      {i.notes && <p className="mt-1 text-[10px] text-text-muted">{i.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Money value={i.budget} size="sm" />
                      {canWrite && (
                        <>
                          <Button
                            variant={i.bought ? "ghost" : "outline"}
                            size="icon"
                            onClick={() => toggle(i.id, !i.bought)}
                            aria-label="Comprado"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {upcomingEvents.length === 0 ? (
            <Empty icon={CalendarHeart} title="Sem datas" description="Adicione datas nos presentes pra ver o calendário." />
          ) : (
            <ol className="relative space-y-3 border-l border-border pl-6">
              {upcomingEvents.map(({ item, next, days }) => (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg-elev">
                    🎂
                  </span>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold">{item.recipient}</p>
                        <p className="text-xs text-text-muted">
                          {item.occasion ?? "Aniversário"} · {format(next, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant={days <= 7 ? "warning" : days <= 30 ? "accent" : "secondary"}>
                        {days === 0 ? "hoje 🎉" : days === 1 ? "amanhã" : `em ${days} dias`}
                      </Badge>
                    </div>
                    {item.idea && (
                      <p className="mt-2 text-xs text-text-muted">
                        💡 {item.idea} {item.budget && `· `}
                        {item.budget && <Money value={item.budget} size="sm" className="num" />}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
