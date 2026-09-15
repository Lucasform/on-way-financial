"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function ObraCreatePrompt({ householdId, canWrite }: { householdId: string; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function create() {
    if (!canWrite || !name.trim()) return;
    start(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada, recarregue a página.");
        return;
      }
      const { error } = await supabase
        .from("modules")
        .insert({ household_id: householdId, kind: "obra", name: name.trim(), status: "active", created_by: user.id });
      if (error) {
        toast.error("Falha ao criar a obra.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-4 pt-12 text-center">
      <p className="text-4xl">🧱</p>
      <h1 className="text-xl font-semibold">Crie sua obra</h1>
      <p className="text-sm text-text-muted">Dê um nome pra começar a acompanhar fornecedores, orçamentos e gastos.</p>
      {canWrite ? (
        <Card className="space-y-3 p-4 text-left">
          <Label htmlFor="oname">Nome da obra</Label>
          <Input id="oname" value={name} onChange={(e) => setName(e.target.value)} placeholder='Ex: "Reforma da Casa"' />
          <Button onClick={create} disabled={pending || !name.trim()} className="w-full">
            Criar
          </Button>
        </Card>
      ) : (
        <p className="text-sm text-text-muted">Peça a um administrador da conta pra criar a obra.</p>
      )}
    </div>
  );
}
