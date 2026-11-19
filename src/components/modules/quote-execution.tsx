"use client";

import { CalendarClock, Check, Loader2, Pencil, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";

import { PaymentPlanBuilder } from "@/components/modules/payment-plan-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { fmtDate, todayISO } from "@/lib/dates";
import { addDaysISO, type PlanResult, toCents } from "@/lib/installments";
import { formatBRL, parseBRL } from "@/lib/money";
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
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  rejected_at?: string | null;
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
  cancelled_at?: string | null;
  cancel_reason?: string | null;
}

export interface ExecutionSnapshot<Q extends ExecQuote = ExecQuote> {
  quote: Q;
  payments: QuotePayment[];
  items: ExecutionItem[];
}

export type QuoteStatus = "aberto" | "execucao" | "aceita" | "cancelada" | "recusada";

export function quoteStatus(q: ExecQuote): QuoteStatus {
  if (q.cancelled_at) return "cancelada";
  if (q.accepted_at) return "aceita";
  if (q.execution_started_at) return "execucao";
  if (q.rejected_at) return "recusada";
  return "aberto";
}

const ERRORS: Record<string, string> = {
  already_started: "Essa cotação já foi executada em outra tela. Atualize a página.",
  paid_now_out_of_range: "O valor pago agora precisa ser menor que o total.",
  has_paid_payments: "Já tem pagamento feito. Apague o pagamento no Gasto antes de cancelar.",
  payment_not_found_or_paid: "Esse pagamento já foi pago ou não existe mais.",
  plan_sum_mismatch: "A soma das parcelas não fecha com o restante. Confira os valores.",
  already_cancelled: "Essa compra já foi cancelada.",
  quote_rejected: "Essa cotação está recusada. Reabra antes de executar.",
  pay_amount_out_of_range:
    "O valor pago precisa ser maior que zero e no máximo o valor da parcela.",
  item_not_found: "Esse pagamento não existe mais. Atualize a página.",
  invalid_amount: "Digite um valor maior que zero.",
  not_from_quote: "Esse lançamento não veio de cotação. Pra tirar do gasto, apague no Gasto.",
  not_executed: "Só dá pra cancelar uma compra que já foi executada.",
};

export async function callExecution<Q extends ExecQuote>(
  body: Record<string, unknown>,
): Promise<ExecutionSnapshot<Q> | null> {
  const res = await fetch("/api/obra/quote-execution", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: unknown } & Partial<
    ExecutionSnapshot<Q>
  >;
  if (!res.ok) {
    toast.error(
      (typeof data.error === "string" && ERRORS[data.error]) ||
        "Não consegui salvar. Tente de novo.",
    );
    return null;
  }
  return data as ExecutionSnapshot<Q>;
}

/**
 * Botão de calendário que abre o seletor de data. O campo de data fica escondido e sem receber toque:
 * no celular ele tem largura mínima própria e, por cima do botão vizinho, roubava o clique do "Pagar".
 */
export function DateButton({
  value,
  disabled,
  label,
  onChange,
  showLabel = false,
}: {
  value: string | null;
  disabled?: boolean;
  label: string;
  onChange: (date: string) => void;
  showLabel?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span
      className={cn(
        "relative inline-flex h-8 shrink-0 overflow-hidden",
        showLabel ? "w-auto" : "w-8",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
            el.click();
          }
        }}
        className={cn(
          "inline-flex h-8 items-center justify-center gap-1 rounded-md hover:bg-bg-elev disabled:opacity-50",
          showLabel ? "border border-border px-2 text-xs text-text-muted" : "w-8",
        )}
        title="Mudar a data"
        aria-label={`Mudar a data de ${label}`}
      >
        <CalendarClock className="h-4 w-4 text-text-muted" />
        {showLabel && "Reagendar"}
      </button>
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </span>
  );
}

export function AmountEditor({
  value,
  disabled,
  label,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  label: string;
  onSave: (amount: number) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setDraft(Number(value).toFixed(2).replace(".", ","));
          setOpen(true);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-elev"
        title="Mudar o valor"
        aria-label={`Mudar o valor de ${label}`}
      >
        <Pencil className="h-3.5 w-3.5 text-text-muted" />
      </button>
    );
  }

  async function save() {
    const v = parseBRL(draft);
    if (v == null || v <= 0) {
      toast.error("Digite um valor maior que zero.");
      return;
    }
    setOpen(false);
    if (toCents(v) !== toCents(Number(value))) await onSave(v);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        inputMode="decimal"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setOpen(false);
        }}
        className="num border-primary/60 h-7 w-24 rounded border bg-bg-elev px-1.5 text-right text-xs font-medium"
        aria-label={`Novo valor de ${label}`}
      />
      <button
        type="button"
        onClick={save}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-elev"
        aria-label="Salvar valor"
      >
        <Check className="h-3.5 w-3.5 text-success" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-elev"
        aria-label="Cancelar"
      >
        <X className="h-3.5 w-3.5 text-text-muted" />
      </button>
    </span>
  );
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
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [saving, setSaving] = useState(false);

  const qty = Number(quantity.replace(",", "."));
  const total = Number.isFinite(qty) && qty > 0 ? toCents(Number(quote.unit_price) * qty) / 100 : 0;
  const paid = parseBRL(paidNow) ?? 0;
  const remainingCents = toCents(total) - toCents(paid);
  const remaining = remainingCents / 100;

  const valid =
    total > 0 &&
    (mode === "total" || (paid >= 0 && remainingCents > 0 && plan !== null && plan.valid));

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const snapshot = await callExecution<Q>({
        action: "start",
        quote_id: quote.id,
        quantity: qty,
        payment:
          mode === "total"
            ? { mode: "total" }
            : {
                mode: "parcial",
                paid_now: paid,
                installments: (plan?.slots ?? []).map((s) => ({
                  label: s.label,
                  amount: s.cents / 100,
                  due_date: s.due_date,
                })),
              },
      });
      if (!snapshot) return;
      toast.success(
        mode === "total"
          ? "Cotação executada e aceita."
          : "Cotação em execução, pagamentos agendados.",
      );
      onDone(snapshot);
    } finally {
      setSaving(false);
    }
  }

  const pill = (active: boolean) =>
    cn(
      "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-text-muted hover:bg-bg-elev-2",
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
              <Input
                id="exec-qty"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="pb-2 text-right">
              <p className="text-[11px] text-text-muted">Total</p>
              <Money value={total} size="sm" className="font-semibold" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={pill(mode === "total")}
                onClick={() => setMode("total")}
              >
                Valor total
              </button>
              <button
                type="button"
                className={pill(mode === "parcial")}
                onClick={() => setMode("parcial")}
              >
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
                  Restante:{" "}
                  <strong className="text-text">{formatBRL(Math.max(remaining, 0))}</strong>
                </p>
              </div>

              {remainingCents > 0 && (
                <div className="space-y-2">
                  <Label>Como paga o restante</Label>
                  <PaymentPlanBuilder remainingCents={remainingCents} onChange={setPlan} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!valid || saving} onClick={submit}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
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
  const [paying, setPaying] = useState<QuotePayment | null>(null);
  const [fixing, setFixing] = useState<QuotePayment | null>(null);
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
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-1.5">
        {sorted.map((p) => {
          const overdue = !p.paid_at && p.due_date !== null && p.due_date < today;
          const dueToday = !p.paid_at && p.due_date === today;
          return (
            <li
              key={p.id}
              className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    p.paid_at
                      ? "border-success bg-success text-white"
                      : overdue
                        ? "border-danger"
                        : "border-border",
                  )}
                >
                  {p.paid_at && <Check className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate", p.paid_at && "text-text-muted")}>
                    {p.label} · <span className="num">{formatBRL(Number(p.amount))}</span>
                  </p>
                  <p
                    className={cn(
                      "text-[11px]",
                      overdue
                        ? "font-medium text-danger"
                        : dueToday
                          ? "font-medium text-warning"
                          : "text-text-muted",
                    )}
                  >
                    {p.paid_at
                      ? `pago em ${fmtDate(p.paid_at, "dd/MM/yyyy")}`
                      : p.due_date
                        ? `${overdue ? "atrasado, venceu" : dueToday ? "vence hoje," : "vence"} ${fmtDate(p.due_date, "dd/MM/yyyy")}`
                        : "sem data"}
                  </p>
                </div>
              </div>
              {canWrite && p.paid_at && p.item_id && (
                <div className="flex shrink-0 justify-end">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setFixing(p)}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-primary hover:bg-bg-elev"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Corrigir
                  </button>
                </div>
              )}
              {canWrite && !p.paid_at && (
                <div className="flex shrink-0 items-center justify-end gap-1.5">
                  <DateButton
                    value={p.due_date}
                    label={p.label}
                    showLabel
                    disabled={busy !== null}
                    onChange={(date) =>
                      run(
                        p.id,
                        { action: "reschedule", payment_id: p.id, due_date: date },
                        "Data atualizada.",
                      )
                    }
                  />
                  <AmountEditor
                    value={Number(p.amount)}
                    label={p.label}
                    disabled={busy !== null}
                    onSave={(amount) =>
                      run(
                        p.id,
                        { action: "amount", payment_id: p.id, amount },
                        "Valor atualizado. O total da cotação foi recalculado.",
                      )
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 min-w-16 px-3 text-xs"
                    disabled={busy !== null}
                    onClick={() => setPaying(p)}
                  >
                    {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Pagar"}
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
          onClick={() =>
            run(
              "cancel",
              { action: "cancel", quote_id: quote.id },
              "Execução cancelada, cotação voltou pra Em aberto.",
            )
          }
          className="text-xs text-text-muted underline-offset-2 hover:text-danger hover:underline"
        >
          Cancelar execução e voltar pra Em aberto
        </button>
      )}
      {paying && (
        <PayDialog<Q>
          payment={paying}
          title={quote.item_name}
          onClose={() => setPaying(null)}
          onDone={(snap) => {
            setPaying(null);
            onChange(snap);
          }}
        />
      )}
      {fixing && fixing.item_id && (
        <CorrectPaymentDialog
          item={{
            id: fixing.item_id,
            name: `${quote.item_name} (${fixing.label})`,
            amount: Number(fixing.amount),
            date: fixing.paid_at,
            fromQuote: true,
          }}
          onClose={() => setFixing(null)}
          onDone={async () => {
            setFixing(null);
            const snap = await callExecution<Q>({ action: "get", quote_id: quote.id });
            if (snap) onChange(snap);
          }}
        />
      )}
    </div>
  );
}

export function QuoteProgressText({
  quote,
  payments,
}: {
  quote: ExecQuote;
  payments: QuotePayment[];
}) {
  const paid = payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);
  return (
    <span className="text-[11px] text-text-muted">
      pago {formatBRL(paid)} de {formatBRL(Number(quote.total_amount ?? 0))}
    </span>
  );
}

export function CancelPurchaseDialog({
  title,
  amount,
  hasSchedule,
  onCancel,
  onConfirm,
}: {
  title: string;
  amount?: number;
  hasSchedule?: boolean;
  onCancel: () => void;
  onConfirm: (args: { date: string; reason: string }) => Promise<void>;
}) {
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (saving || !date) return;
    setSaving(true);
    try {
      await onConfirm({ date, reason: reason.trim() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-bg-elev p-5 shadow-2xl">
        <p className="text-sm font-semibold">Cancelar compra (reembolso)</p>
        <p className="mb-4 truncate text-xs text-text-muted">
          {title}
          {amount != null && <> · {formatBRL(amount)}</>}
        </p>
        <div className="space-y-3">
          <ul className="space-y-1 text-xs text-text-muted">
            <li>
              - Sai do Gasto e dos totais, mas continua no histórico do fornecedor como cancelada.
            </li>
            {hasSchedule && <li>- As parcelas que ainda não foram pagas são removidas.</li>}
          </ul>
          <div className="space-y-1">
            <Label htmlFor="cancel-date">Data do cancelamento/reembolso</Label>
            <Input
              id="cancel-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Input
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: produto devolvido, estorno no cartão"
              maxLength={300}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Voltar
          </Button>
          <Button variant="destructive" size="sm" disabled={saving || !date} onClick={confirm}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Cancelar compra
          </Button>
        </div>
      </div>
    </>
  );
}

type RestMode = "reschedule" | "cancel";

function defaultRestDate(due: string | null | undefined) {
  const today = todayISO();
  return due && due > today ? due : addDaysISO(today, 7);
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-bg-elev p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            {subtitle && <p className="truncate text-xs text-text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-muted hover:text-text"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

function RestChoice({
  restCents,
  mode,
  onMode,
  dueDate,
  onDueDate,
}: {
  restCents: number;
  mode: RestMode;
  onMode: (m: RestMode) => void;
  dueDate: string;
  onDueDate: (d: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-bg-elev-2 p-3">
      <p className="text-xs font-medium">
        Sobram <span className="num">{formatBRL(restCents / 100)}</span>. O que fazer com o
        restante?
      </p>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="radio"
          className="mt-1"
          checked={mode === "reschedule"}
          onChange={() => onMode("reschedule")}
        />
        <span className="min-w-0 flex-1">
          Reagendar o restante
          {mode === "reschedule" && (
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => onDueDate(e.target.value)}
              className="mt-1 h-9"
              aria-label="Nova data do restante"
            />
          )}
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="radio"
          className="mt-1"
          checked={mode === "cancel"}
          onChange={() => onMode("cancel")}
        />
        <span>
          Cancelar o restante
          <span className="block text-[11px] text-text-muted">
            Desconto ou valor que não vai ser pago: o total da compra diminui.
          </span>
        </span>
      </label>
    </div>
  );
}

/** Pagar uma parcela agendada: valor (pode ser parte), data, e o que fazer com o restante. */
export function PayDialog<Q extends ExecQuote>({
  payment,
  title,
  onClose,
  onDone,
}: {
  payment: { id: string; label: string; amount: number; due_date: string | null };
  title: string;
  onClose: () => void;
  onDone: (snapshot: ExecutionSnapshot<Q>) => void;
}) {
  const full = toCents(Number(payment.amount));
  const [amountText, setAmountText] = useState((full / 100).toFixed(2).replace(".", ","));
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState<RestMode>("reschedule");
  const [dueDate, setDueDate] = useState(defaultRestDate(payment.due_date));
  const [saving, setSaving] = useState(false);

  const value = parseBRL(amountText);
  const paid = value == null ? 0 : toCents(value);
  const rest = full - paid;
  const invalid = paid <= 0 || paid > full;

  async function submit() {
    if (saving) return;
    if (invalid) {
      toast.error(`Digite um valor entre R$ 0,01 e ${formatBRL(full / 100)}.`);
      return;
    }
    if (rest > 0 && mode === "reschedule" && !dueDate) {
      toast.error("Escolha a nova data do restante.");
      return;
    }
    setSaving(true);
    try {
      const snap = await callExecution<Q>({
        action: "pay",
        payment_id: payment.id,
        date,
        amount: paid / 100,
        remainder:
          rest > 0 ? (mode === "reschedule" ? { mode, due_date: dueDate } : { mode }) : undefined,
      });
      if (!snap) return;
      toast.success(
        rest > 0
          ? mode === "reschedule"
            ? `Pago ${formatBRL(paid / 100)}. O restante foi pra ${fmtDate(dueDate, "dd/MM/yyyy")}.`
            : `Pago ${formatBRL(paid / 100)}. O restante foi cancelado.`
          : "Pagamento registrado.",
      );
      onDone(snap);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={`Pagar ${payment.label}`}
      subtitle={`${title} · parcela de ${formatBRL(full / 100)}`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="pay-amount">Valor pago</Label>
            <Input
              id="pay-amount"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="num"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-date">Data do pagamento</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        {!invalid && rest > 0 && (
          <RestChoice
            restCents={rest}
            mode={mode}
            onMode={setMode}
            dueDate={dueDate}
            onDueDate={setDueDate}
          />
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Voltar
          </Button>
          <Button size="sm" disabled={saving} onClick={submit}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : rest > 0 && !invalid ? (
              "Pagar parte"
            ) : (
              "Pagar"
            )}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

/**
 * Corrigir um pagamento já lançado sem apagar: valor e data certos. Se veio de cotação e ficou menor,
 * o restante é reagendado ou cancelado; dá também pra desfazer (volta pra agendado).
 */
export function CorrectPaymentDialog({
  item,
  onClose,
  onDone,
}: {
  item: { id: string; name: string; amount: number; date: string | null; fromQuote: boolean };
  onClose: () => void;
  onDone: () => void;
}) {
  const old = toCents(Number(item.amount));
  const [amountText, setAmountText] = useState((old / 100).toFixed(2).replace(".", ","));
  const [date, setDate] = useState(item.date ?? todayISO());
  const [mode, setMode] = useState<RestMode>("reschedule");
  const [dueDate, setDueDate] = useState(defaultRestDate(null));
  const [saving, setSaving] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);

  const value = parseBRL(amountText);
  const now = value == null ? 0 : toCents(value);
  const rest = old - now;

  async function save() {
    if (saving) return;
    if (now <= 0) {
      toast.error("Digite um valor maior que zero.");
      return;
    }
    if (now === old && date === (item.date ?? "")) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const snap = await callExecution({
        action: "correct_paid",
        item_id: item.id,
        amount: now / 100,
        date,
        remainder:
          item.fromQuote && rest > 0
            ? mode === "reschedule"
              ? { mode, due_date: dueDate }
              : { mode }
            : undefined,
      });
      if (!snap) return;
      toast.success(
        item.fromQuote && rest > 0 && mode === "reschedule"
          ? `Corrigido. ${formatBRL(rest / 100)} reagendado pra ${fmtDate(dueDate, "dd/MM/yyyy")}.`
          : "Pagamento corrigido.",
      );
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function undo() {
    if (saving) return;
    setSaving(true);
    try {
      const snap = await callExecution({ action: "unpay", item_id: item.id });
      if (!snap) return;
      toast.success("Pagamento desfeito. O valor voltou pra Agendados.");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Corrigir pagamento"
      subtitle={`${item.name} · lançado ${formatBRL(old / 100)}`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="fix-amount">Valor que foi pago</Label>
            <Input
              id="fix-amount"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="num"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fix-date">Data do pagamento</Label>
            <Input
              id="fix-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        {now > 0 &&
          rest > 0 &&
          (item.fromQuote ? (
            <RestChoice
              restCents={rest}
              mode={mode}
              onMode={setMode}
              dueDate={dueDate}
              onDueDate={setDueDate}
            />
          ) : (
            <p className="text-[11px] text-text-muted">
              A diferença de {formatBRL(rest / 100)} sai do gasto.
            </p>
          ))}
        {now > old && (
          <p className="text-[11px] text-text-muted">
            O gasto aumenta {formatBRL((now - old) / 100)}.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Voltar
          </Button>
          <Button size="sm" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar correção"}
          </Button>
        </div>
        {item.fromQuote && (
          <div className="border-t border-border pt-3">
            {confirmUndo ? (
              <div className="space-y-2">
                <p className="text-xs text-text-muted">
                  O lançamento sai do gasto e os {formatBRL(old / 100)} voltam pra Agendados, na
                  data do pagamento. Confirma?
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmUndo(false)}>
                    Não
                  </Button>
                  <Button variant="outline" size="sm" disabled={saving} onClick={undo}>
                    Sim, desfazer
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmUndo(true)}
                className="text-xs font-medium text-danger hover:underline"
              >
                Desfazer pagamento (volta pra Agendados)
              </button>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
