"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Field {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
}
interface Module { id: string; name: string; config: { fields?: Field[] } | unknown }
interface Item {
  id: string;
  title: string;
  amount: number | null;
  due_date: string | null;
  status: string;
  position: number;
  data: Record<string, unknown>;
}

export function CustomDashboard({ module, items: initial, canWrite }: { module: Module; items: Item[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const fields: Field[] = (module.config as { fields?: Field[] }).fields ?? [];
  const [items, setItems] = useState(initial);
  const [definedFields, setDefinedFields] = useState<Field[]>(fields);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Item> & { extras: Record<string, string> }>({ title: "", extras: {} });
  const [newField, setNewField] = useState<Field>({ key: "", label: "", type: "text" });

  function addField() {
    if (!canWrite || !newField.key.trim() || !newField.label.trim()) return;
    start(async () => {
      const updated = [...definedFields, newField];
      const { error } = await supabase
        .from("modules")
        .update({ config: { fields: updated } })
        .eq("id", module.id);
      if (error) {
        toast.error("Falha ao salvar campo.");
        return;
      }
      setDefinedFields(updated);
      setNewField({ key: "", label: "", type: "text" });
    });
  }

  function addItem() {
    if (!canWrite || !draft.title) return;
    start(async () => {
      const data: Record<string, unknown> = {};
      for (const f of definedFields) {
        data[f.key] = draft.extras[f.key] ?? null;
      }
      const { data: row } = await supabase
        .from("custom_items")
        .insert({
          module_id: module.id,
          title: draft.title!,
          amount: draft.amount ?? null,
          due_date: draft.due_date ?? null,
          status: "todo",
          position: items.length * 10 + 10,
          data,
        })
        .select("*")
        .single();
      if (row) setItems((s) => [...s, row as Item]);
      setDraft({ title: "", extras: {} });
    });
  }

  function removeItem(id: string) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("custom_items").delete().eq("id", id);
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/modules" className="text-xs text-text-muted hover:text-text">← Módulos</Link>
        <h1 className="text-2xl font-semibold">✨ {module.name}</h1>
      </header>

      {canWrite && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Adicionar campo customizado</h3>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Chave (ex: meta)" value={newField.key} onChange={(e) => setNewField({ ...newField, key: e.target.value })} />
            <Input placeholder="Rótulo" value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} />
            <select
              value={newField.type}
              onChange={(e) => setNewField({ ...newField, type: e.target.value as Field["type"] })}
              className="h-10 rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="date">Data</option>
            </select>
            <Button onClick={addField} disabled={pending || !newField.key || !newField.label}>
              <Plus className="h-4 w-4" /> Campo
            </Button>
          </div>
          {definedFields.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              Campos: {definedFields.map((f) => `${f.label} (${f.type})`).join(", ")}
            </p>
          )}
        </Card>
      )}

      {canWrite && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Novo item</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Título" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Valor" value={draft.amount ?? ""} onChange={(e) => setDraft({ ...draft, amount: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input type="date" value={draft.due_date ?? ""} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
            {definedFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`extra-${f.key}`}>{f.label}</Label>
                <Input
                  id={`extra-${f.key}`}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={draft.extras[f.key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, extras: { ...draft.extras, [f.key]: e.target.value } })}
                />
              </div>
            ))}
            <Button onClick={addItem} disabled={pending || !draft.title} className="sm:col-span-3">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty icon={Sparkles} title="Sem itens ainda" description="Defina campos e comece a registrar." />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-xs text-text-muted">
                    {i.due_date && `prazo ${i.due_date} · `}
                    {definedFields.map((f) => `${f.label}: ${String(i.data?.[f.key] ?? "—")}`).join(" · ")}
                  </p>
                </div>
                <Money value={i.amount} size="sm" />
                {canWrite && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)}>
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
