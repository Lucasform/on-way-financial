"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, todayISO } from "@/lib/dates";
import {
  addDaysISO,
  addMonthsClamped,
  buildPlan,
  type Frequency,
  FREQUENCY_LABELS,
  type PlanBlock,
  type PlanResult,
} from "@/lib/installments";
import { formatBRL, parseBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

type BlockType = "unico" | "entrada" | "parcelas" | "intercaladas" | "final";

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "unico", label: "Pagamento único" },
  { value: "entrada", label: "Entrada" },
  { value: "parcelas", label: "Parcelas fixas" },
  { value: "intercaladas", label: "Intercaladas (ex.: semestrais)" },
  { value: "final", label: "Parcela final" },
];

interface UiBlock {
  id: string;
  type: BlockType;
  label: string;
  date: string;
  frequency: Frequency;
  first_date: string;
  count: string;
  amount: string;
  auto: boolean;
}

let seq = 0;
const newId = () => `b${++seq}`;

function preset(type: BlockType, auto: boolean, id = newId()): UiBlock {
  const today = todayISO();
  const base = { id, type, amount: "", auto, frequency: "mensal" as Frequency, first_date: addDaysISO(today, 30), count: "12" };
  switch (type) {
    case "entrada":
      return { ...base, label: "entrada", date: today };
    case "parcelas":
      return { ...base, label: "parcela", date: today };
    case "intercaladas":
      return { ...base, label: "intercalada", date: today, frequency: "semestral", first_date: addMonthsClamped(today, 6), count: "2" };
    case "final":
      return { ...base, label: "parcela final", date: addMonthsClamped(today, 12) };
    case "unico":
    default:
      return { ...base, label: "restante", date: addDaysISO(today, 30) };
  }
}

const isRecurring = (t: BlockType) => t === "parcelas" || t === "intercaladas";

function toPlanBlock(b: UiBlock): PlanBlock {
  const amount = parseBRL(b.amount);
  return isRecurring(b.type)
    ? {
        id: b.id,
        kind: "recurring",
        label: b.label,
        frequency: b.frequency,
        first_date: b.first_date,
        count: Number(b.count) || 0,
        amount,
        auto: b.auto,
      }
    : { id: b.id, kind: "single", label: b.label, date: b.date, amount, auto: b.auto };
}

const centsToInput = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export function PaymentPlanBuilder({ remainingCents, onChange }: { remainingCents: number; onChange: (r: PlanResult) => void }) {
  const [blocks, setBlocks] = useState<UiBlock[]>(() => [preset("unico", true)]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const plan = useMemo(() => buildPlan(remainingCents, blocks.map(toPlanBlock), overrides), [remainingCents, blocks, overrides]);

  useEffect(() => {
    onChange(plan);
  }, [plan, onChange]);

  function update(id: string, patch: Partial<UiBlock>) {
    setBlocks((s) => s.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(`${id}:`))));
  }

  function changeType(b: UiBlock, type: BlockType) {
    update(b.id, { ...preset(type, b.auto, b.id), amount: b.amount });
  }

  function setAuto(id: string) {
    setBlocks((s) => s.map((b) => ({ ...b, auto: b.id === id ? !b.auto : false })));
  }

  function addBlock(type: BlockType) {
    setBlocks((s) => [...s, preset(type, !s.some((b) => b.auto))]);
  }

  function removeBlock(id: string) {
    setBlocks((s) => {
      const next = s.filter((b) => b.id !== id);
      return next.some((b) => b.auto) || next.length === 0 ? next : next.map((b, i) => (i === 0 ? { ...b, auto: true } : b));
    });
    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(`${id}:`))));
  }

  function setSlotAmount(key: string, currentCents: number, raw: string) {
    const v = parseBRL(raw);
    if (v == null) return;
    const cents = Math.round(v * 100);
    if (cents === currentCents) return;
    setOverrides((o) => ({ ...o, [key]: cents }));
  }

  function fixOnLast() {
    const last = plan.slots[plan.slots.length - 1];
    if (!last) return;
    const cents = last.cents + plan.diffCents;
    if (cents > 0) setOverrides((o) => ({ ...o, [last.key]: cents }));
  }

  const select = "h-9 w-full rounded-md border border-border bg-bg-elev px-2 text-sm";

  return (
    <div className="space-y-3">
      {blocks.map((b) => {
        const rec = isRecurring(b.type);
        return (
          <div key={b.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <select
                value={b.type}
                onChange={(e) => changeType(b, e.target.value as BlockType)}
                className={select}
                aria-label="Tipo de pagamento"
              >
                {BLOCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {blocks.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeBlock(b.id)} aria-label="Tirar este pagamento">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </div>

            {rec ? (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={b.frequency}
                  onChange={(e) => update(b.id, { frequency: e.target.value as Frequency })}
                  className={cn(select, "col-span-2")}
                  aria-label="Frequência"
                >
                  {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </select>
                <div className="space-y-1">
                  <Label htmlFor={`${b.id}-first`} className="text-[11px]">1º pagamento</Label>
                  <Input id={`${b.id}-first`} type="date" value={b.first_date} onChange={(e) => update(b.id, { first_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${b.id}-count`} className="text-[11px]">Quantas vezes</Label>
                  <Input id={`${b.id}-count`} type="number" min="1" max="240" value={b.count} onChange={(e) => update(b.id, { count: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor={`${b.id}-date`} className="text-[11px]">Data</Label>
                <Input id={`${b.id}-date`} type="date" value={b.date} onChange={(e) => update(b.id, { date: e.target.value })} />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor={`${b.id}-amount`} className="text-[11px]">{rec ? "Valor de cada" : "Valor"}</Label>
              {b.auto ? (
                <p className="flex h-9 items-center rounded-md border border-dashed border-primary/50 px-3 text-xs text-primary">
                  Automático: completa o que falta
                </p>
              ) : (
                <Input
                  id={`${b.id}-amount`}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={b.amount}
                  onChange={(e) => update(b.id, { amount: e.target.value })}
                />
              )}
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-[11px] text-text-muted">
                <input type="checkbox" checked={b.auto} onChange={() => setAuto(b.id)} className="h-3.5 w-3.5 accent-primary" />
                Calcular automático com o que faltar
              </label>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-1.5">
        {BLOCK_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => addBlock(t.value)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-bg-elev-2 hover:text-text"
          >
            <Plus className="h-3 w-3" /> {t.label}
          </button>
        ))}
      </div>

      {plan.slots.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-elev-2">
          <p className="border-b border-border px-3 py-2 text-[11px] text-text-muted">
            {plan.slots.length} pagamento{plan.slots.length > 1 ? "s" : ""}. Toque no valor pra ajustar uma parcela.
          </p>
          <ul className="max-h-56 divide-y divide-border overflow-y-auto">
            {plan.slots.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                <span className="min-w-0 truncate text-text-muted">
                  {s.due_date ? fmtDate(s.due_date, "dd/MM/yyyy") : "sem data"} · {s.label}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {s.overridden && (
                    <button
                      type="button"
                      onClick={() => setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== s.key)))}
                      aria-label="Desfazer ajuste"
                      title="Desfazer ajuste"
                      className="text-text-muted hover:text-text"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                  <input
                    key={`${s.key}-${s.cents}`}
                    defaultValue={centsToInput(s.cents)}
                    inputMode="decimal"
                    onBlur={(e) => setSlotAmount(s.key, s.cents, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className={cn(
                      "num h-7 w-24 rounded border bg-bg-elev px-1.5 text-right font-medium",
                      s.cents <= 0 ? "border-danger text-danger" : s.overridden ? "border-primary/60" : "border-border",
                    )}
                    aria-label={`Valor de ${s.label}`}
                  />
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
            <span className="text-text-muted">
              Agendado <strong className="text-text">{formatBRL(plan.totalCents / 100)}</strong> de {formatBRL(remainingCents / 100)}
            </span>
            {plan.diffCents === 0 ? (
              <span className="font-medium text-success">Fechou certinho</span>
            ) : (
              <span className="flex items-center gap-2">
                <span className={cn("font-medium", plan.diffCents > 0 ? "text-warning" : "text-danger")}>
                  {plan.diffCents > 0 ? `Falta ${formatBRL(plan.diffCents / 100)}` : `Passou ${formatBRL(-plan.diffCents / 100)}`}
                </span>
                {plan.slots.length > 0 && plan.slots[plan.slots.length - 1]!.cents + plan.diffCents > 0 && (
                  <button type="button" onClick={fixOnLast} className="text-primary underline-offset-2 hover:underline">
                    acertar na última
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
