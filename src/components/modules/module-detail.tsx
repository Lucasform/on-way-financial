"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Upload, Check, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl, pct } from "@/lib/utils";
import { KINDS, STATUS_LABEL, type ModuleKind } from "@/lib/modules";
import { Card, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { QuotesSection } from "@/components/modules/quotes-section";
import { DiarySection } from "@/components/modules/diary-section";

type Mod = { id: string; kind: ModuleKind; name: string; status: string; budget: number };
type Item = { id: string; title: string; item_type: string; planned_amount: number; status: string; done: boolean; due_date: string | null };
type Expense = { id: string; description: string | null; amount: number; occurred_on: string };
type Gal = { id: string; image_url: string; caption: string | null };

const ITEM_STATUS = ["todo", "doing", "done", "blocked"] as const;
const STATUS_PT: Record<string, string> = { todo: "A fazer", doing: "Fazendo", done: "Feito", blocked: "Travado" };

export function ModuleDetail({
  householdId,
  module,
  items,
  expenses,
  gallery,
  quotes,
  suppliers,
  diary,
}: {
  householdId: string;
  module: Mod;
  items: Item[];
  expenses: Expense[];
  gallery: Gal[];
  quotes: any[];
  suppliers: { id: string; name: string }[];
  diary: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const C = KINDS[module.kind] ?? KINDS.custom;

  const planned = items.reduce((s, i) => s + Number(i.planned_amount), 0);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const usedPct = Number(module.budget) > 0 ? (spent / Number(module.budget)) * 100 : 0;
  const refresh = () => router.refresh();

  async function setStatus(status: string) {
    await supabase.from("modules").update({ status }).eq("id", module.id);
    refresh();
  }

  // itens (plano)
  const [item, setItem] = useState({ title: "", item_type: C.typeOptions[0] ?? "Item", planned: "" });
  async function addItem() {
    if (!item.title.trim()) return;
    await supabase.from("module_items").insert({
      module_id: module.id,
      household_id: householdId,
      title: item.title,
      item_type: item.item_type,
      planned_amount: parseFloat(item.planned.replace(",", ".")) || 0,
      position: items.length,
    });
    setItem({ title: "", item_type: C.typeOptions[0] ?? "Item", planned: "" });
    refresh();
  }
  async function cycleStatus(it: Item) {
    const idx = ITEM_STATUS.indexOf(it.status as any);
    const next = ITEM_STATUS[(idx + 1) % ITEM_STATUS.length];
    await supabase.from("module_items").update({ status: next, done: next === "done" }).eq("id", it.id);
    refresh();
  }
  async function delItem(id: string) {
    await supabase.from("module_items").delete().eq("id", id);
    refresh();
  }
  async function addTemplate() {
    if (!C.template.length) return;
    await supabase.from("module_items").insert(
      C.template.map((t, i) => ({
        module_id: module.id,
        household_id: householdId,
        title: t,
        item_type: C.typeOptions[0] ?? "Item",
        position: items.length + i,
      })),
    );
    refresh();
  }

  // despesas (realizado) — viram transações vinculadas ao módulo
  const [exp, setExp] = useState({ description: "", amount: "" });
  async function addExpense() {
    const amount = parseFloat(exp.amount.replace(",", "."));
    if (!exp.description.trim() || !amount) return;
    await supabase.from("transactions").insert({
      household_id: householdId,
      module_id: module.id,
      type: "expense",
      amount,
      description: exp.description,
      occurred_on: new Date().toISOString().slice(0, 10),
      source: "manual",
    });
    setExp({ description: "", amount: "" });
    refresh();
  }
  async function delExpense(id: string) {
    await supabase.from("transactions").delete().eq("id", id);
    refresh();
  }

  // galeria
  const [uploading, setUploading] = useState(false);
  async function upload(file: File) {
    setUploading(true);
    const path = `${module.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("obra").upload(path, file);
    if (!error) {
      const { data: pub } = supabase.storage.from("obra").getPublicUrl(path);
      await supabase.from("module_gallery").insert({ module_id: module.id, household_id: householdId, image_url: pub.publicUrl });
    }
    setUploading(false);
    refresh();
  }
  async function delPhoto(id: string) {
    await supabase.from("module_gallery").delete().eq("id", id);
    refresh();
  }

  const Icon = C.icon;

  return (
    <div className="space-y-6">
      <Link href="/modules" className="inline-flex items-center gap-1 text-sm text-fg-soft hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Módulos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: C.accent }}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{module.name}</h1>
            <p className="text-sm text-fg-soft">{C.label}</p>
          </div>
        </div>
        <Select value={module.status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Orçamento" value={brl(Number(module.budget))} />
        <Stat label={`${C.plannedLabel} (plano)`} value={brl(planned)} />
        <Stat label="Realizado" value={brl(spent)} tone="danger" />
        <Stat label="Saldo" value={brl(Number(module.budget) - spent)} tone={Number(module.budget) - spent >= 0 ? "success" : "danger"} />
      </div>

      {/* Comparativo */}
      <Card>
        <CardTitle>Comparativo</CardTitle>
        <div className="mt-3 space-y-3 text-sm">
          <Bar label={`${C.plannedLabel} planejado`} value={planned} max={Math.max(planned, spent, Number(module.budget), 1)} color="hsl(var(--brand))" />
          <Bar label="Realizado" value={spent} max={Math.max(planned, spent, Number(module.budget), 1)} color="hsl(var(--danger))" />
          <Bar label="Orçamento" value={Number(module.budget)} max={Math.max(planned, spent, Number(module.budget), 1)} color="hsl(var(--muted))" />
        </div>
        <p className="mt-3 text-xs text-muted">
          {spent > planned && planned > 0 ? "⚠ Gasto acima do planejado." : `${pct(usedPct)} do orçamento usado.`}
        </p>
      </Card>

      {/* Plano (itens/etapas) */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>{C.itemLabel}s / plano</CardTitle>
          {C.template.length > 0 && (
            <Button onClick={addTemplate} variant="outline" size="sm">
              <Wand2 className="h-3.5 w-3.5" /> Etapas padrão
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cycleStatus(it)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    it.status === "done" ? "bg-success/15 text-success" : it.status === "doing" ? "bg-brand-soft text-brand" : it.status === "blocked" ? "bg-danger/15 text-danger" : "bg-surface-2 text-fg-soft"
                  }`}
                >
                  {STATUS_PT[it.status]}
                </button>
                <span className="font-medium">{it.title}</span>
                <span className="text-xs text-muted">{it.item_type}</span>
              </div>
              <div className="flex items-center gap-3">
                {Number(it.planned_amount) > 0 && <span className="num text-xs text-fg-soft">{brl(Number(it.planned_amount))}</span>}
                <button onClick={() => delItem(it.id)} className="text-fg-soft hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input className="sm:col-span-2" value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} placeholder={C.itemLabel} list="kind-types" />
            <Select value={item.item_type} onChange={(e) => setItem({ ...item, item_type: e.target.value })}>
              {C.typeOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>
            <Input inputMode="decimal" value={item.planned} onChange={(e) => setItem({ ...item, planned: e.target.value })} placeholder={`${C.plannedLabel} R$`} />
          </div>
          <Button onClick={addItem} variant="outline" className="w-full">
            <Plus className="h-4 w-4" /> Adicionar {C.itemLabel.toLowerCase()}
          </Button>
        </div>
      </Card>

      {/* Cotações com IA + fornecedores */}
      <QuotesSection householdId={householdId} moduleId={module.id} quotes={quotes} suppliers={suppliers} />

      {/* Despesas (realizado) */}
      <Card>
        <CardTitle>Despesas</CardTitle>
        <div className="mt-3 space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{e.description || "—"}</span>
                <span className="ml-2 text-xs text-muted">{new Date(e.occurred_on).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="num font-semibold text-danger">{brl(Number(e.amount))}</span>
                <button onClick={() => delExpense(e.id)} className="text-fg-soft hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <Input className="col-span-2" value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} placeholder="Descrição" />
            <Input inputMode="decimal" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} placeholder="R$" />
          </div>
          <Button onClick={addExpense} variant="outline" className="w-full">
            <Plus className="h-4 w-4" /> Lançar despesa
          </Button>
        </div>
      </Card>

      {/* Galeria */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Fotos</CardTitle>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
            <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Enviar"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(ev) => ev.target.files?.[0] && upload(ev.target.files[0])} />
          </label>
        </div>
        {gallery.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhuma foto ainda.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((g) => (
              <div key={g.id} className="group relative overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image_url} alt={g.caption || ""} className="h-28 w-full object-cover" />
                <button onClick={() => delPhoto(g.id)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-lg bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Diário de obra */}
      <DiarySection householdId={householdId} moduleId={module.id} entries={diary} />
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-fg-soft">{label}</span>
        <span className="num font-medium">{brl(value)}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
      </div>
    </div>
  );
}
