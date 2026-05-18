"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Gift, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";

interface Module { id: string; name: string }
interface Item {
  id: string;
  recipient: string;
  occasion: string | null;
  occasion_date: string | null;
  idea: string | null;
  budget: number | null;
  bought: boolean;
}

export function GiftDashboard({ module, items: initial, canWrite }: { module: Module; items: Item[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Item>>({ recipient: "" });

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

  return (
    <div className="space-y-6">
      <header>
        <Link href="/modules" className="text-xs text-text-muted hover:text-text">← Módulos</Link>
        <h1 className="text-2xl font-semibold">🎁 {module.name}</h1>
      </header>

      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-6">
            <Input placeholder="Para quem" value={draft.recipient ?? ""} onChange={(e) => setDraft({ ...draft, recipient: e.target.value })} />
            <Input placeholder="Ocasião" value={draft.occasion ?? ""} onChange={(e) => setDraft({ ...draft, occasion: e.target.value })} />
            <Input type="date" value={draft.occasion_date ?? ""} onChange={(e) => setDraft({ ...draft, occasion_date: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Ideia" value={draft.idea ?? ""} onChange={(e) => setDraft({ ...draft, idea: e.target.value })} />
            <Input type="number" step="0.01" placeholder="R$" value={draft.budget ?? ""} onChange={(e) => setDraft({ ...draft, budget: e.target.value === "" ? null : Number(e.target.value) })} />
            <Button onClick={add} disabled={pending || !draft.recipient} className="sm:col-span-6"><Plus className="h-4 w-4" /> Adicionar presente</Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty icon={Gift} title="Sem presentes ainda" description="Anote ideias antes de esquecer 🎁" />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{i.recipient}</p>
                    {i.bought && <Badge variant="success">comprado</Badge>}
                  </div>
                  <p className="text-xs text-text-muted">
                    {i.occasion}{i.occasion_date && ` · ${fmtDate(i.occasion_date)}`}{i.idea && ` · ${i.idea}`}
                  </p>
                </div>
                <Money value={i.budget} size="sm" />
                {canWrite && (
                  <>
                    <Button variant={i.bought ? "ghost" : "outline"} size="icon" onClick={() => toggle(i.id, !i.bought)} aria-label="Comprado">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
