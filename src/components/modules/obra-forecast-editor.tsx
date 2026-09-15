"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface PhaseRow {
  id: string;
  name: string;
  planned_budget: number | null;
}

interface Props {
  initial: PhaseRow[];
  canWrite: boolean;
}

export function ObraForecastEditor({ initial, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [rows, setRows] = useState(initial);
  const [, start] = useTransition();

  function save(id: string, value: string) {
    const num = value.trim() === "" ? null : Number(value);
    setRows((s) => s.map((r) => (r.id === id ? { ...r, planned_budget: num } : r)));
    start(async () => {
      const { error } = await supabase.from("obra_phases").update({ planned_budget: num }).eq("id", id);
      if (error) toast.error("Falha ao salvar previsão.");
    });
  }

  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + Number(r.planned_budget ?? 0), 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-bg-elev-2 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Planilha de previsão por fase</p>
        <Money value={total} size="sm" tone="muted" />
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="flex-1 truncate">{r.name}</span>
            {canWrite ? (
              <Input
                type="number"
                step="0.01"
                min="0"
                defaultValue={r.planned_budget ?? ""}
                onBlur={(e) => save(r.id, e.target.value)}
                placeholder="0,00"
                className="h-8 w-32 text-right"
              />
            ) : (
              <Money value={r.planned_budget} size="sm" />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
