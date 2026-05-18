"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { ModuleKind } from "@/types/database";

interface Props {
  householdId: string;
  userId: string;
  canWrite: boolean;
  defaultKind?: ModuleKind;
  triggerLabel?: string;
}

const KIND_LABEL: Record<ModuleKind, string> = {
  obra: "🧱 Obra",
  travel: "✈️ Viagem",
  car: "🚗 Carro novo",
  gift: "🎁 Presente",
  education: "🎓 Educação",
  custom: "✨ Personalizado",
};

const OBRA_DEFAULT_PHASES = [
  "Projeto/Aprovações",
  "Demolição",
  "Estrutura",
  "Hidráulica",
  "Elétrica",
  "Alvenaria",
  "Piso",
  "Pintura",
  "Marcenaria",
  "Acabamento",
  "Decoração",
  "Limpeza final",
];

export function ModuleCreateDialog({ householdId, userId, canWrite, defaultKind = "obra", triggerLabel }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<ModuleKind>(defaultKind);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function submit() {
    if (!canWrite || !name.trim()) return;
    start(async () => {
      const { data, error } = await supabase
        .from("modules")
        .insert({
          household_id: householdId,
          kind,
          name: name.trim(),
          status: "active",
          budget: budget === "" ? null : Number(budget),
          start_date: startDate || null,
          end_date: endDate || null,
          config: {},
          created_by: userId,
        })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Falha ao criar módulo.");
        return;
      }
      if (kind === "obra") {
        await supabase.from("obra_phases").insert(
          OBRA_DEFAULT_PHASES.map((p, i) => ({ module_id: data.id, name: p, position: i * 10 })),
        );
      }
      toast.success("Módulo criado.");
      setOpen(false);
      router.push(`/modules/${kind}/${data.id}`);
      router.refresh();
    });
  }

  if (!canWrite) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {triggerLabel ?? "Novo módulo"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar módulo</DialogTitle>
          <DialogDescription>Configure o tipo, o orçamento e as datas previstas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="mkind">Tipo</Label>
            <select
              id="mkind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ModuleKind)}
              className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              {Object.entries(KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mname">Nome</Label>
            <Input id="mname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Reforma da cozinha 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="mbudget">Orçamento (R$)</Label>
              <Input
                id="mbudget"
                type="number"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mstart">Início</Label>
              <Input id="mstart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="mend">Término previsto</Label>
              <Input id="mend" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {pending ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
