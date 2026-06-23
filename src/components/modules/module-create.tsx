"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KINDS, KIND_LIST, type ModuleKind } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function ModuleCreate({ householdId }: { householdId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<ModuleKind>("obra");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data: mod } = await supabase
      .from("modules")
      .insert({
        household_id: householdId,
        kind,
        name,
        budget: parseFloat(budget.replace(",", ".")) || 0,
        status: "planning",
      })
      .select("id")
      .single();
    setSaving(false);
    setOpen(false);
    setName("");
    setBudget("");
    if (mod) router.push(`/modules/${mod.id}`);
    else router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo módulo
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo módulo">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-fg-soft">Tipo</p>
            <div className="grid grid-cols-3 gap-2">
              {KIND_LIST.map((k) => {
                const C = KINDS[k];
                const Icon = C.icon;
                const active = kind === k;
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition",
                      active ? "border-brand bg-brand-soft text-brand" : "border-border hover:bg-surface-2",
                    )}
                  >
                    <Icon className="h-5 w-5" style={active ? undefined : { color: C.accent }} />
                    {C.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Minha ${KINDS[kind].label.toLowerCase()}`} />
          </Field>
          <Field label="Orçamento total (R$)">
            <Input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0,00" />
          </Field>
          <Button onClick={create} loading={saving} className="w-full">
            Criar e abrir
          </Button>
        </div>
      </Modal>
    </>
  );
}
