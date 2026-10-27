"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { fmtDate, todayISO } from "@/lib/dates";
import { addDaysISO, planRemainder, toCents, type Frequency, type RemainderSchedule } from "@/lib/installments";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface QuotePayment {
  id: string;
  quote_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  item_id: string | null;
}

export interface ExecQuote {
  id: string;
  item_name: string;
  unit: string;
  unit_price: number;
  accepted_at: string | null;
  execution_started_at?: string | null;
  total_amount?: number | null;
}

export interface ExecutionItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  actual_unit_price: number | null;
  status: string;
  bought_at: string | null;
}

export interface ExecutionSnapshot<Q extends ExecQuote = ExecQuote> {
  quote: Q;
  payments: QuotePayment[];
  items: ExecutionItem[];
}

export type QuoteStatus = "aberto" | "execucao" | "aceita";

export function quoteStatus(q: ExecQuote): QuoteStatus {
  if (q.accepted_at) return "aceita";
  if (q.execution_started_at) return "execucao";
  return "aberto";
}

const ERRORS: Record<string, string> = {
  already_started: "Essa cotação já foi executada em outra tela. Atualize a página.",
  paid_now_out_of_range: "O valor pago agora precisa ser menor que o total.",
  has_paid_payments: "Já tem pagamento feito. Apague o pagamento no Gasto antes de cancelar.",
  payment_not_found_or_paid: "Esse pagamento já foi pago ou não existe mais.",
};

export async function callExecution<Q extends ExecQuote>(body: Record<string, unknown>): Promise<ExecutionSnapshot<Q> | null> {
  const res = await fetch("/api/obra/quote-execution", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: unknown } & Partial<ExecutionSnapshot<Q>>;
  if (!res.ok) {
    toast.error((typeof data.error === "string" && ERRORS[data.error]) || "Não consegui salvar. Tente de novo.");
    return null;
  }
  return data as ExecutionSnapshot<Q>;
}

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "semanal", label: "Toda semana" },
  { value: "quinzenal", label: "A cada 15 dias" },
  { value: "mensal", label: "Todo mês" },
];

function parseMoney(v: string): number {
  return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
}

export function ExecuteQuoteDialog<Q extends ExecQuote>({
  quote,
  onDone,
  onCancel,
}: {
  quote: Q;
  onDone: (snapshot: ExecutionSnapshot<Q>) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [mode, setMode] = useState<"total" | "parcial">("total");
  const [paidNow, setPaidNow] = useState("");
  const [restType, setRestType] = useState<"single" | "recurring">("single");
  const [singleDate, setSingleDate] = useState(addDaysISO(todayISO(), 30));
  const [frequency, setFrequency] = useState<Frequency>("mensal");
  const [firstDate, setFirstDate] = useState(addDaysISO(todayISO(), 30));
  const [count, setCount] = useState("2");
  const [saving, setSaving] = useState(false);

  const qty = Number(quantity.replace(",", "."));
  const total = Number.isFinite(qty) && qty > 0 ? toCents(Number(quote.unit_price) * qty) / 100 : 0;
  const paid = parseMoney(paidNow);
  const remaining = toCents(total - paid) / 100;
  const n = Math.floor(Number(count));

  const schedule: RemainderSchedule | null =
    restType === "single"
      ? singleDate
        ? { type: "single", due_date: singleDate }
        : null
      : firstDate && n >= 1 && n <= 60
        ? { type: "recurring", frequency, first_date: firstDate, count: n }
        : null;

  const preview = useMemo(
    () => (mode === "parcial" && schedule && remaining > 0 ? planRemainder(remaining, schedule) : []),
    [mode, schedule?.type, singleDate, frequency, firstDate, n, remaining], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const valid =
    total > 0 && (mode === "total" || (paid >= 0 && toCents(paid) < toCents(total) && schedule !== null && remaining > 0));

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const snapshot = await callExecution<Q>({
        action: "start",
        quote_id: quote.id,
        quantity: qty,
        payment: mode === "total" ? { mode: "total" } : { mode: "parcial", paid_now: paid, schedule },
      });
      if (!snapshot) return;
      toast.success(mode === "total" ? "Cotação executada e aceita." : "Cotação em execução, restante agendado.");
      onDone(snapshot);
    } finally {
      setSaving(false);
    }
  }

  const pill = (active: boolean) =>
    cn(
      "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
      active ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:bg-bg-elev-2",
    );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-bg-elev p-5 shadow-2xl">
        <p className="text-sm font-semibold">Executar cotação</p>
        <p className="mb-4 truncate text-xs text-text-muted">
          {quote.item_name} · {formatBRL(Number(quote.unit_price))}/{quote.unit}
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="exec-qty">Quantidade ({quote.unit})</Label>
              <Input id="exec-qty" type="number" step="0.01" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="pb-2 text-right">
              <p className="text-[11px] text-text-muted">Total</p>
              <Money value={total} size="sm" className="font-semibold" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={pill(mode === "total")} onClick={() => setMode("total")}>
                Valor total
              </button>
              <button type="button" className={pill(mode === "parcial")} onClick={() => setMode("parcial")}>
                Parcial
              </button>
            </div>
            <p className="text-[11px] text-text-muted">
              {mode === "total"
                ? "Pago tudo: a cotação vai direto pra Aceita e o custo entra no Gasto."
                : "Pagou uma parte (ou nada ainda): o restante fica agendado e a cotação vai pra Em execução."}
            </p>
          </div>

          {mode === "parcial" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="exec-paid">Quanto pagou agora</Label>
                <Input
                  id="exec-paid"
                  inputMode="decimal"
                  placeholder="0,00 (deixe vazio se não pagou nada)"
                  value={paidNow}
                  onChange={(e) => setPaidNow(e.target.value)}
                />
                <p className="text-[11px] text-text-muted">
                  Restante: <strong className="text-text">{formatBRL(Math.max(remaining, 0))}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Agendar o restante</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className={pill(restType === "single")} onClick={() => setRestType("single")}>
                    Numa data
                  </button>
                  <button type="button" className={pill(restType === "recurring")} onClick={() => setRestType("recurring")}>
                    Recorrente
                  </button>
                </div>
                {restType === "single" ? (
                  <Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} aria-label="Data do pagamento" />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as Frequency)}
                      className="col-span-2 h-10 rounded-md border border-border bg-bg-elev px-3 text-sm"
                      aria-label="Frequência"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <div className="space-y-1">
                      <Label htmlFor="exec-first" className="text-[11px]">1º pagamento</Label>
                      <Input id="exec-first" type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="exec-count" className="text-[11px]">Quantas vezes</Label>
                      <Input id="exec-count" type="number" min="1" max="60" value={count} onChange={(e) => setCount(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {preview.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-bg-elev-2 p-2 text-xs">
                  {preview.map((p) => (
                    <li key={p.label} className="flex items-center justify-between gap-2">
                      <span className="text-text-muted">
                        {fmtDate(p.due_date, "dd/MM/yyyy")} · {p.label}
                      </span>
                      <span className="num font-medium">{formatBRL(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!valid || saving} onClick={submit}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Executar
          </Button>
        </div>
      </div>
    </>
  );
}

export function QuotePaymentsPanel<Q extends ExecQuote>({
  quote,
  payments,
  canWrite,
  onChange,
}: {
  quote: Q;
  payments: QuotePayment[];
  canWrite: boolean;
  onChange: (snapshot: ExecutionSnapshot<Q>) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayISO();
  const total = Number(quote.total_amount ?? 0);
  const paid = payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const sorted = [...payments].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  async function run(key: string, body: Record<string, unknown>, success: string) {
    setBusy(key);
    try {
      const snap = await callExecution<Q>(body);
      if (snap) {
        toast.success(success);
        onChange(snap);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 border-t border-border bg-bg-elev-2 px-4 py-3">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-text-muted">
            Pago <strong className="text-text">{formatBRL(paid)}</strong> de {formatBRL(total)}
          </span>
          <span className="font-medium text-primary">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-1.5">
        {sorted.map((p) => {
          const overdue = !p.paid_at && p.due_date !== null && p.due_date < today;
          const dueToday = !p.paid_at && p.due_date === today;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  p.paid_at ? "border-success bg-success text-white" : overdue ? "border-danger" : "border-border",
                )}
              >
                {p.paid_at && <Check className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate", p.paid_at && "text-text-muted")}>
                  {p.label} · <span className="num">{formatBRL(Number(p.amount))}</span>
                </p>
                <p className={cn("text-[11px]", overdue ? "font-medium text-danger" : dueToday ? "font-medium text-warning" : "text-text-muted")}>
                  {p.paid_at
                    ? `pago em ${fmtDate(p.paid_at, "dd/MM/yyyy")}`
                    : p.due_date
                      ? `${overdue ? "atrasado, venceu" : dueToday ? "vence hoje," : "vence"} ${fmtDate(p.due_date, "dd/MM/yyyy")}`
                      : "sem data"}
                </p>
              </div>
              {canWrite && !p.paid_at && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <label className="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md hover:bg-bg-elev" title="Mudar a data">
                    <CalendarClock className="h-3.5 w-3.5 text-text-muted" />
                    <input
                      type="date"
                      value={p.due_date ?? ""}
                      disabled={busy !== null}
                      onChange={(e) =>
                        e.target.value &&
                        run(p.id, { action: "reschedule", payment_id: p.id, due_date: e.target.value }, "Data atualizada.")
                      }
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label={`Mudar a data de ${p.label}`}
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={busy !== null}
                    onClick={() => run(p.id, { action: "pay", payment_id: p.id }, "Pagamento registrado.")}
                  >
                    {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pagar"}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {canWrite && payments.every((p) => !p.paid_at) && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("cancel", { action: "cancel", quote_id: quote.id }, "Execução cancelada, cotação voltou pra Em aberto.")}
          className="text-xs text-text-muted underline-offset-2 hover:text-danger hover:underline"
        >
          Cancelar execução e voltar pra Em aberto
        </button>
      )}
    </div>
  );
}

export function QuoteProgressText({ quote, payments }: { quote: ExecQuote; payments: QuotePayment[] }) {
  const paid = payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);
  return (
    <span className="text-[11px] text-text-muted">
      pago {formatBRL(paid)} de {formatBRL(Number(quote.total_amount ?? 0))}
    </span>
  );
}
