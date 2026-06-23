"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Upload, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl, pct } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

type Project = {
  id: string;
  name: string;
  status: string;
  budget_total: number;
  address: string | null;
};
type Phase = { id: string; name: string; status: string; progress_pct: number; budget_amount: number };
type Item = { id: string; name: string; category: string; quantity: number; unit_cost: number; estimated_amount: number };
type Expense = { id: string; description: string; supplier: string | null; amount: number; paid: boolean; occurred_on: string; receipt_url: string | null };
type Doc = { id: string; title: string; kind: string; file_url: string };

const STATUS = ["planning", "in_progress", "paused", "done"];

export function ProjectDetail({
  householdId,
  project,
  phases,
  items,
  expenses,
  docs,
}: {
  householdId: string;
  project: Project;
  phases: Phase[];
  items: Item[];
  expenses: Expense[];
  docs: Doc[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const estimated = items.reduce((s, i) => s + Number(i.estimated_amount), 0);
  const used = Number(project.budget_total) > 0 ? (spent / Number(project.budget_total)) * 100 : 0;

  async function refresh() {
    router.refresh();
  }

  async function setStatus(status: string) {
    await supabase.from("construction_projects").update({ status }).eq("id", project.id);
    refresh();
  }

  // ── Etapas ──
  const [phaseName, setPhaseName] = useState("");
  async function addPhase() {
    if (!phaseName.trim()) return;
    await supabase.from("construction_phases").insert({
      project_id: project.id,
      household_id: householdId,
      name: phaseName,
      sort_order: phases.length,
    });
    setPhaseName("");
    refresh();
  }
  async function setPhaseProgress(id: string, p: number) {
    await supabase
      .from("construction_phases")
      .update({ progress_pct: p, status: p >= 100 ? "done" : p > 0 ? "in_progress" : "pending" })
      .eq("id", id);
    refresh();
  }
  async function delPhase(id: string) {
    await supabase.from("construction_phases").delete().eq("id", id);
    refresh();
  }

  // ── Itens de orçamento ──
  const [item, setItem] = useState({ name: "", category: "material", quantity: "1", unit_cost: "" });
  async function addItem() {
    if (!item.name.trim()) return;
    await supabase.from("construction_budget_items").insert({
      project_id: project.id,
      household_id: householdId,
      name: item.name,
      category: item.category,
      quantity: parseFloat(item.quantity.replace(",", ".")) || 1,
      unit_cost: parseFloat(item.unit_cost.replace(",", ".")) || 0,
    });
    setItem({ name: "", category: "material", quantity: "1", unit_cost: "" });
    refresh();
  }
  async function delItem(id: string) {
    await supabase.from("construction_budget_items").delete().eq("id", id);
    refresh();
  }

  // ── Despesas ──
  const [exp, setExp] = useState({ description: "", supplier: "", amount: "" });
  async function addExpense() {
    const amount = parseFloat(exp.amount.replace(",", "."));
    if (!exp.description.trim() || !amount) return;
    await supabase.from("construction_expenses").insert({
      project_id: project.id,
      household_id: householdId,
      description: exp.description,
      supplier: exp.supplier || null,
      amount,
    });
    setExp({ description: "", supplier: "", amount: "" });
    refresh();
  }
  async function togglePaid(e: Expense) {
    await supabase.from("construction_expenses").update({ paid: !e.paid }).eq("id", e.id);
    refresh();
  }
  async function delExpense(id: string) {
    await supabase.from("construction_expenses").delete().eq("id", id);
    refresh();
  }

  // ── Upload (recibo de despesa ou foto/doc) ──
  const [uploading, setUploading] = useState(false);
  async function uploadFile(file: File, opts: { expenseId?: string }) {
    setUploading(true);
    const path = `${project.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("obra").upload(path, file, { upsert: false });
    if (!error) {
      const { data: pub } = supabase.storage.from("obra").getPublicUrl(path);
      if (opts.expenseId) {
        await supabase.from("construction_expenses").update({ receipt_url: pub.publicUrl }).eq("id", opts.expenseId);
      } else {
        const isImg = /\.(png|jpe?g|webp|gif|heic)$/i.test(file.name);
        await supabase.from("construction_documents").insert({
          project_id: project.id,
          household_id: householdId,
          title: file.name,
          kind: isImg ? "photo" : "other",
          file_url: pub.publicUrl,
        });
      }
    }
    setUploading(false);
    refresh();
  }
  async function delDoc(d: Doc) {
    await supabase.from("construction_documents").delete().eq("id", d.id);
    refresh();
  }

  return (
    <div className="space-y-6">
      <Link href="/obra" className="inline-flex items-center gap-1 text-sm text-fg-soft hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Obras
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.address && <p className="text-sm text-fg-soft">{project.address}</p>}
        </div>
        <Select value={project.status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Orçamento" value={brl(Number(project.budget_total))} />
        <Stat label="Estimado (itens)" value={brl(estimated)} />
        <Stat label="Gasto" value={brl(spent)} tone="danger" />
        <Stat label="Saldo" value={brl(Number(project.budget_total) - spent)} tone={Number(project.budget_total) - spent >= 0 ? "success" : "danger"} />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${used > 100 ? "bg-danger" : "bg-brand"}`} style={{ width: `${Math.min(used, 100)}%` }} />
      </div>

      {/* Etapas */}
      <Card>
        <CardTitle>Etapas</CardTitle>
        <div className="mt-3 space-y-3">
          {phases.map((ph) => (
            <div key={ph.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{ph.name}</p>
                <div className="flex items-center gap-2">
                  <span className="num text-xs text-muted">{pct(ph.progress_pct)}</span>
                  <button onClick={() => delPhase(ph.id)} className="text-fg-soft hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                defaultValue={ph.progress_pct}
                onMouseUp={(e) => setPhaseProgress(ph.id, Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => setPhaseProgress(ph.id, Number((e.target as HTMLInputElement).value))}
                className="mt-2 w-full accent-[hsl(var(--brand))]"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={phaseName} onChange={(e) => setPhaseName(e.target.value)} placeholder="Nova etapa (ex: Fundação)" onKeyDown={(e) => e.key === "Enter" && addPhase()} />
            <Button onClick={addPhase} variant="outline" size="md">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Itens de orçamento */}
      <Card>
        <CardTitle>Itens de orçamento</CardTitle>
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{it.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {it.category} · {it.quantity} × {brl(Number(it.unit_cost))}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="num font-semibold">{brl(Number(it.estimated_amount))}</span>
                <button onClick={() => delItem(it.id)} className="text-fg-soft hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Input className="sm:col-span-2" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Item" />
            <Select value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })}>
              <option value="material">material</option>
              <option value="labor">mão de obra</option>
              <option value="equipment">equipamento</option>
              <option value="service">serviço</option>
              <option value="other">outro</option>
            </Select>
            <Input inputMode="decimal" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} placeholder="Qtd" />
            <Input inputMode="decimal" value={item.unit_cost} onChange={(e) => setItem({ ...item, unit_cost: e.target.value })} placeholder="R$ unit." />
          </div>
          <Button onClick={addItem} variant="outline" className="w-full">
            <Plus className="h-4 w-4" /> Adicionar item
          </Button>
        </div>
      </Card>

      {/* Despesas */}
      <Card>
        <CardTitle>Despesas</CardTitle>
        <div className="mt-3 space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePaid(e)}
                  className={`grid h-6 w-6 place-items-center rounded-md border ${e.paid ? "border-success bg-success/15 text-success" : "border-border text-transparent"}`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <div>
                  <span className="font-medium">{e.description}</span>
                  {e.supplier && <span className="ml-2 text-xs text-muted">{e.supplier}</span>}
                  <span className="ml-2 text-xs text-muted">{new Date(e.occurred_on).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {e.receipt_url ? (
                  <a href={e.receipt_url} target="_blank" className="text-xs text-brand underline">
                    recibo
                  </a>
                ) : (
                  <label className="cursor-pointer text-fg-soft hover:text-brand">
                    <Upload className="h-3.5 w-3.5" />
                    <input type="file" className="hidden" onChange={(ev) => ev.target.files?.[0] && uploadFile(ev.target.files[0], { expenseId: e.id })} />
                  </label>
                )}
                <span className="num font-semibold text-danger">{brl(Number(e.amount))}</span>
                <button onClick={() => delExpense(e.id)} className="text-fg-soft hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input className="sm:col-span-2" value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} placeholder="Descrição" />
            <Input value={exp.supplier} onChange={(e) => setExp({ ...exp, supplier: e.target.value })} placeholder="Fornecedor" />
            <Input inputMode="decimal" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} placeholder="R$" />
          </div>
          <Button onClick={addExpense} variant="outline" className="w-full">
            <Plus className="h-4 w-4" /> Lançar despesa
          </Button>
        </div>
      </Card>

      {/* Documentos e fotos */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Fotos e documentos</CardTitle>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Enviando..." : "Enviar"}
            <input type="file" className="hidden" disabled={uploading} onChange={(ev) => ev.target.files?.[0] && uploadFile(ev.target.files[0], {})} />
          </label>
        </div>
        {docs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum arquivo ainda.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {docs.map((d) => (
              <div key={d.id} className="group relative overflow-hidden rounded-xl border border-border">
                {d.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.file_url} alt={d.title} className="h-28 w-full object-cover" />
                ) : (
                  <a href={d.file_url} target="_blank" className="grid h-28 place-items-center bg-surface-2 p-2 text-center text-xs text-fg-soft">
                    {d.title}
                  </a>
                )}
                <button
                  onClick={() => delDoc(d)}
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-lg bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
