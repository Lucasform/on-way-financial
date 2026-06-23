"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";

export function NewProject({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [address, setAddress] = useState("");

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("construction_projects").insert({
      household_id: householdId,
      name,
      address: address || null,
      budget_total: parseFloat(budget.replace(",", ".")) || 0,
      status: "planning",
    });
    setSaving(false);
    setOpen(false);
    setName("");
    setBudget("");
    setAddress("");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova obra
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova obra">
        <div className="space-y-3">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Casa, reforma cozinha..." />
          </Field>
          <Field label="Endereço (opcional)">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Orçamento total (R$)">
            <Input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0,00" />
          </Field>
          <Button onClick={save} loading={saving} className="w-full">
            Criar
          </Button>
        </div>
      </Modal>
    </>
  );
}
