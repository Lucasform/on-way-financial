import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Money } from "@/components/ui/money";
import { fmtDate, todayISO } from "@/lib/dates";
import { percent } from "@/lib/money";
import type { ObraItem, PhaseRef } from "@/components/modules/obra-items-tab";

interface Phase extends PhaseRef {
  planned_budget: number | null;
  status: string;
  planned_end: string | null;
}

interface Props {
  budget: number | null;
  spent: number;
  items: ObraItem[];
  phases: Phase[];
}

export function ObraForecastTab({ budget, spent, items, phases }: Props) {
  const planned = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price ?? 0), 0);
  const pending = items
    .filter((i) => i.status === "planned" || i.status === "ordered")
    .reduce((s, i) => s + Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0), 0);
  const projected = spent + pending;
  const balance = budget != null ? Number(budget) - projected : null;
  const today = todayISO();

  const byPhase = phases.map((p) => {
    const phaseItems = items.filter((i) => i.phase_id === p.id);
    const phasePlanned = phaseItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price ?? 0), 0);
    const phaseActual = phaseItems
      .filter((i) => i.status === "bought" || i.status === "installed")
      .reduce((s, i) => s + Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0), 0);
    const late = p.status !== "done" && !!p.planned_end && p.planned_end < today;
    return { ...p, phasePlanned, phaseActual, late };
  });

  const lateCount = byPhase.filter((p) => p.late).length;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Orçado (itens)" value={<Money value={planned} size="lg" tone="muted" />} />
        <Stat label="Já gasto" value={<Money value={spent} size="lg" />} />
        <Stat label="A gastar (pendente)" value={<Money value={pending} size="lg" className="text-warning" />} />
        <Stat
          label="Projeção total"
          value={<Money value={projected} size="lg" tone={budget != null && projected > budget ? "danger" : "success"} />}
        />
      </section>

      {budget != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-text-muted">
              {balance != null && balance < 0 ? (
                <TrendingDown className="h-4 w-4 text-danger" />
              ) : (
                <TrendingUp className="h-4 w-4 text-success" />
              )}
              Saldo projetado do orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Money value={balance} size="xl" tone={balance != null && balance < 0 ? "danger" : "success"} />
            <p className="text-xs text-text-muted">
              Orçamento <Money value={budget} size="sm" className="inline" tone="muted" /> menos o já gasto e o que
              ainda falta comprar/instalar.
            </p>
          </CardContent>
        </Card>
      )}

      {lateCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {lateCount} {lateCount === 1 ? "fase está" : "fases estão"} com previsão de término vencida.
        </div>
      )}

      {byPhase.length === 0 ? (
        <Empty title="Sem fases" description="Crie fases na aba Fases pra ver a previsão por etapa." />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Previsão por fase</div>
          <ul className="divide-y divide-border">
            {byPhase.map((p) => {
              const pct = p.phasePlanned > 0 ? percent(p.phaseActual, p.phasePlanned) : 0;
              return (
                <li key={p.id} className="px-4 py-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {p.name} {p.late && <Badge variant="warning">atrasada</Badge>}
                    </p>
                    <p className="text-xs text-text-muted">
                      <Money value={p.phaseActual} size="sm" className="inline" /> /{" "}
                      <Money value={p.phasePlanned} size="sm" className="inline" tone="muted" />
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-elev-2">
                    <div
                      className={`h-full ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {p.planned_end && (
                    <p className="mt-1 text-[10px] text-text-muted">Previsão de término: {fmtDate(p.planned_end)}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );
}
