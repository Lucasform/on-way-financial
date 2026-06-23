"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function HouseholdRename({ householdId, name }: { householdId: string; name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("households").update({ name: value }).eq("id", householdId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Field label="Nome da casa / família">
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      </div>
      <Button onClick={save} loading={saving}>
        {saved ? <Check className="h-4 w-4" /> : null}
        {saved ? "Salvo" : "Salvar"}
      </Button>
    </div>
  );
}
