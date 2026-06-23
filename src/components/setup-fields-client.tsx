"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FIELD_TYPES, toApiName, type CustomField, type ObjectKey } from "@/lib/setup";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";

export function SetupFieldsClient({
  householdId,
  objectKey,
  fields,
}: {
  householdId: string;
  objectKey: ObjectKey;
  fields: CustomField[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", type: "text", required: false, options: "", help: "" });

  async function add() {
    if (!form.label.trim()) return;
    setSaving(true);
    const api = toApiName(form.label);
    await supabase.from("custom_fields").insert({
      household_id: householdId,
      object_key: objectKey,
      api_name: api,
      label: form.label,
      type: form.type,
      required: form.required,
      options: form.type === "picklist" ? form.options.split(",").map((o) => o.trim()).filter(Boolean) : [],
      help: form.help || null,
      position: fields.length,
    });
    setSaving(false);
    setOpen(false);
    setForm({ label: "", type: "text", required: false, options: "", help: "" });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir campo? Os valores já preenchidos permanecem no histórico.")) return;
    await supabase.from("custom_fields").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo campo
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            Nenhum campo customizado. Crie campos para capturar informações extras neste objeto.
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {fields.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-sm font-medium">
                      {f.label}
                      {f.required && <span className="ml-1 text-danger">*</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {FIELD_TYPES[f.type]} · <code className="text-fg-soft">{f.api_name}</code>
                      {f.type === "picklist" && f.options.length > 0 && ` · ${f.options.join(", ")}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => remove(f.id)} className="text-fg-soft hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo campo">
        <div className="space-y-3">
          <Field label="Rótulo (label)">
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Centro de custo" />
          </Field>
          {form.label && (
            <p className="text-xs text-muted">
              Nome da API: <code className="text-fg-soft">{toApiName(form.label)}</code>
            </p>
          )}
          <Field label="Tipo">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(FIELD_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          {form.type === "picklist" && (
            <Field label="Opções (separadas por vírgula)">
              <Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Casa, Trabalho, Lazer" />
            </Field>
          )}
          <Field label="Texto de ajuda (opcional)">
            <Input value={form.help} onChange={(e) => setForm({ ...form, help: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--brand))]" />
            Obrigatório
          </label>
          <Button onClick={add} loading={saving} className="w-full">Criar campo</Button>
        </div>
      </Modal>
    </div>
  );
}
