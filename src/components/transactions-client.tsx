"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { CustomFields } from "@/components/custom-fields";
import type { CustomField } from "@/lib/setup";

export type TxRow = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string | null;
  occurred_on: string;
  source: string;
  category_id: string | null;
  account_id: string | null;
  module_id?: string | null;
};
type Cat = { id: string; name: string; kind: string; color: string | null };
type Acc = { id: string; name: string };
type Mod = { id: string; name: string };

type FormState = {
  id: string;
  type: "income" | "expense";
  amount: string;
  description: string;
  occurred_on: string;
  category_id: string;
  account_id: string;
  module_id: string;
  custom: Record<string, any>;
};

const empty: FormState = {
  id: "",
  type: "expense",
  amount: "",
  description: "",
  occurred_on: new Date().toISOString().slice(0, 10),
  category_id: "",
  account_id: "",
  module_id: "",
  custom: {},
};

export function TransactionsClient({
  householdId,
  rows,
  categories,
  accounts,
  modules = [],
  customFields = [],
}: {
  householdId: string;
  rows: TxRow[];
  categories: Cat[];
  accounts: Acc[];
  modules?: Mod[];
  customFields?: CustomField[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [catF, setCatF] = useState("all");

  const catName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = rows.filter((r) => {
    if (typeF !== "all" && r.type !== typeF) return false;
    if (catF !== "all" && r.category_id !== catF) return false;
    if (q && !(r.description || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  function openNew() {
    setForm(empty);
    setOpen(true);
  }
  function openEdit(r: TxRow) {
    setForm({
      id: r.id,
      type: r.type === "transfer" ? "expense" : r.type,
      amount: String(r.amount),
      description: r.description ?? "",
      occurred_on: r.occurred_on,
      category_id: r.category_id ?? "",
      account_id: r.account_id ?? "",
      module_id: r.module_id ?? "",
      custom: (r as any).custom ?? {},
    });
    setOpen(true);
  }

  async function save() {
    const amount = parseFloat(String(form.amount).replace(",", "."));
    if (!amount || amount <= 0) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      household_id: householdId,
      type: form.type,
      amount,
      description: form.description || null,
      occurred_on: form.occurred_on,
      category_id: form.category_id || null,
      account_id: form.account_id || null,
      module_id: form.module_id || null,
      custom: form.custom || {},
    };
    if (form.id) {
      await supabase.from("transactions").update(payload).eq("id", form.id);
    } else {
      await supabase.from("transactions").insert({ ...payload, source: "manual" });
    }
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar descrição"
            className="pl-9"
          />
        </div>
        <Select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="w-36">
          <option value="all">Todos os tipos</option>
          <option value="expense">Saídas</option>
          <option value="income">Entradas</option>
        </Select>
        <Select value={catF} onChange={(e) => setCatF(e.target.value)} className="w-44">
          <option value="all">Todas categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button onClick={openNew} size="md">
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nenhum lançamento com esses filtros.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => {
              const cat = t.category_id ? catName[t.category_id] : null;
              return (
                <li key={t.id} className="group flex items-center justify-between px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: cat?.color || "#64748b" }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description || "—"}</p>
                      <p className="text-xs text-muted">
                        {new Date(t.occurred_on).toLocaleDateString("pt-BR")}
                        {cat ? ` · ${cat.name}` : ""} · {t.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`num text-sm font-semibold ${
                        t.type === "income" ? "text-success" : "text-danger"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {brl(Number(t.amount))}
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(t)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-fg-soft hover:bg-surface-2"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(t.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-fg-soft hover:bg-danger/15 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar lançamento" : "Novo lançamento"}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm({ ...form, type: "expense" })}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${form.type === "expense" ? "border-danger bg-danger/10 text-danger" : "border-border"}`}
            >
              Saída
            </button>
            <button
              onClick={() => setForm({ ...form, type: "income" })}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${form.type === "income" ? "border-success bg-success/10 text-success" : "border-border"}`}
            >
              Entrada
            </button>
          </div>
          <Field label="Valor (R$)">
            <Input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0,00"
            />
          </Field>
          <Field label="Descrição">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data">
              <Input
                type="date"
                value={form.occurred_on}
                onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
              />
            </Field>
            <Field label="Categoria">
              <Select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">—</option>
                {categories
                  .filter((c) => c.kind === form.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          {accounts.length > 0 && (
            <Field label="Conta">
              <Select
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              >
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {modules.length > 0 && (
            <Field label="Obra / Módulo">
              <Select
                value={form.module_id}
                onChange={(e) => setForm({ ...form, module_id: e.target.value })}
              >
                <option value="">— (só no geral)</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <CustomFields
            fields={customFields}
            values={form.custom}
            onChange={(k, v) => setForm((f) => ({ ...f, custom: { ...f.custom, [k]: v } }))}
          />
          <Button onClick={save} loading={saving} className="w-full">
            {form.id ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
