"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Phone, Mail, Star, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";

type Supplier = {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  contact: string | null;
  rating: number | null;
};

export function SuppliersClient({ householdId, suppliers }: { householdId: string; suppliers: Supplier[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", phone: "", email: "", contact: "", rating: "0" });

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("suppliers").insert({
      household_id: householdId,
      name: form.name,
      category: form.category || null,
      phone: form.phone || null,
      email: form.email || null,
      contact: form.contact || null,
      rating: parseInt(form.rating) || null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", category: "", phone: "", email: "", contact: "", rating: "0" });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir fornecedor?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo fornecedor
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Truck className="h-6 w-6" />
            </div>
            <p className="text-sm text-fg-soft">Cadastre fornecedores para usar nas cotações dos módulos.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.category && <p className="text-xs text-muted">{s.category}</p>}
                </div>
                <button onClick={() => remove(s.id)} className="text-fg-soft hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {s.rating ? (
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < (s.rating ?? 0) ? "fill-warning text-warning" : "text-border"}`} />
                  ))}
                </div>
              ) : null}
              <div className="mt-3 space-y-1 text-sm text-fg-soft">
                {s.contact && <p>{s.contact}</p>}
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 hover:text-brand">
                    <Phone className="h-3.5 w-3.5" /> {s.phone}
                  </a>
                )}
                {s.email && (
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 hover:text-brand">
                    <Mail className="h-3.5 w-3.5" /> {s.email}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo fornecedor">
        <div className="space-y-3">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Casa do Construtor" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Categoria">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Material, Mão de obra..." />
            </Field>
            <Field label="Contato">
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="João" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Telefone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(19) 99999-9999" />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@..." />
            </Field>
          </div>
          <Field label="Avaliação (0-5)">
            <Input inputMode="numeric" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
          </Field>
          <Button onClick={add} loading={saving} className="w-full">Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
