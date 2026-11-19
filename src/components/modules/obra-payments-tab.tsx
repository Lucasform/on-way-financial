"use client";

import { CalendarClock, CheckCircle2, ChevronRight, Pencil, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AmountEditor,
  callExecution,
  CorrectPaymentDialog,
  DateButton,
  PayDialog,
} from "@/components/modules/quote-execution";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Money } from "@/components/ui/money";
import { fmtDate } from "@/lib/dates";
import { addDaysISO } from "@/lib/installments";
import { cn } from "@/lib/utils";

export interface ScheduledRow {
  id: string;
  quote_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  item_name: string;
  supplier_id: string | null;
  supplier_name: string | null;
}

export interface ExecutedRow {
  id: string;
  name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  amount: number;
  date: string;
  payment_label: string | null;
  quote_id: string | null;
}

type Tab = "agendados" | "executados";

interface Props {
  scheduled: ScheduledRow[];
  executed: ExecutedRow[];
  today: string;
  initialTab: Tab;
  canWrite: boolean;
}

function SupplierLink({ id, name }: { id: string | null; name: string | null }) {
  if (!name) return null;
  if (!id) {
    return (
      <p className="flex min-w-0 items-center gap-1 text-xs text-text-muted">
        <Store className="h-3 w-3 shrink-0" />
        <span className="truncate">{name}</span>
      </p>
    );
  }
  return (
    <Link
      href={`/overview/fornecedores/${id}`}
      className="inline-flex max-w-full items-center gap-1 py-0.5 text-xs font-medium text-primary hover:underline"
      title="Abrir o fornecedor"
    >
      <Store className="h-3 w-3 shrink-0" />
      <span className="truncate">{name}</span>
      <ChevronRight className="h-3 w-3 shrink-0" />
    </Link>
  );
}

export function ObraPaymentsTab({
  scheduled: initialScheduled,
  executed: initialExecuted,
  today,
  initialTab,
  canWrite,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [scheduled, setScheduled] = useState(initialScheduled);
  const [executed, setExecuted] = useState(initialExecuted);
  const [busy, setBusy] = useState<string | null>(null);
  const [paying, setPaying] = useState<ScheduledRow | null>(null);
  const [fixing, setFixing] = useState<ExecutedRow | null>(null);
  const router = useRouter();

  // depois de pagar parte, corrigir ou desfazer, a página recarrega os dados do servidor
  useEffect(() => setScheduled(initialScheduled), [initialScheduled]);
  useEffect(() => setExecuted(initialExecuted), [initialExecuted]);

  const weekEnd = addDaysISO(today, 7);
  const scheduledTotal = scheduled.reduce((s, p) => s + p.amount, 0);
  const executedTotal = executed.reduce((s, e) => s + e.amount, 0);
  const overdueCount = scheduled.filter((p) => p.due_date !== null && p.due_date < today).length;

  const scheduledGroups = useMemo(() => {
    const sorted = [...scheduled].sort((a, b) =>
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
    );
    const groups = [
      {
        key: "late",
        title: "Atrasados",
        list: sorted.filter((p) => p.due_date !== null && p.due_date < today),
      },
      {
        key: "week",
        title: "Esta semana",
        list: sorted.filter(
          (p) => p.due_date !== null && p.due_date >= today && p.due_date <= weekEnd,
        ),
      },
      {
        key: "later",
        title: "Mais pra frente",
        list: sorted.filter((p) => p.due_date !== null && p.due_date > weekEnd),
      },
      { key: "nodate", title: "Sem data", list: sorted.filter((p) => p.due_date === null) },
    ];
    return groups.filter((g) => g.list.length > 0);
  }, [scheduled, today, weekEnd]);

  const executedGroups = useMemo(() => {
    const map = new Map<string, ExecutedRow[]>();
    for (const e of [...executed].sort((a, b) => b.date.localeCompare(a.date))) {
      const key = e.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].map(([month, list]) => ({
      month,
      title: fmtDate(`${month}-01`, "MMMM 'de' yyyy"),
      total: list.reduce((s, e) => s + e.amount, 0),
      list,
    }));
  }, [executed]);

  async function reschedule(p: ScheduledRow, dueDate: string) {
    setBusy(p.id);
    try {
      const snap = await callExecution({
        action: "reschedule",
        payment_id: p.id,
        due_date: dueDate,
      });
      if (!snap) return;
      setScheduled((s) => s.map((x) => (x.id === p.id ? { ...x, due_date: dueDate } : x)));
      toast.success("Data atualizada.");
    } finally {
      setBusy(null);
    }
  }

  async function changeAmount(p: ScheduledRow, amount: number) {
    setBusy(p.id);
    try {
      const snap = await callExecution({ action: "amount", payment_id: p.id, amount });
      if (!snap) return;
      const fresh = new Map(snap.payments.map((x) => [x.id, x]));
      setScheduled((s) =>
        s
          .filter((x) => x.quote_id !== p.quote_id || !fresh.get(x.id)?.paid_at)
          .map((x) => (fresh.has(x.id) ? { ...x, amount: Number(fresh.get(x.id)!.amount) } : x)),
      );
      toast.success("Valor atualizado. O total da cotação foi recalculado.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setTab("agendados")} className="text-left">
          <Card
            className={cn(
              "p-4 transition-colors hover:bg-bg-elev-2",
              tab === "agendados" && "border-primary/60",
            )}
          >
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <CalendarClock className="h-3.5 w-3.5" /> Agendado
            </p>
            <Money value={scheduledTotal} size="lg" />
            {overdueCount > 0 && (
              <p className="text-[11px] font-medium text-danger">
                {overdueCount} atrasado{overdueCount > 1 ? "s" : ""}
              </p>
            )}
          </Card>
        </button>
        <button type="button" onClick={() => setTab("executados")} className="text-left">
          <Card
            className={cn(
              "p-4 transition-colors hover:bg-bg-elev-2",
              tab === "executados" && "border-primary/60",
            )}
          >
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <Wallet className="h-3.5 w-3.5" /> Executado
            </p>
            <Money value={executedTotal} size="lg" />
          </Card>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["agendados", `Agendados (${scheduled.length})`],
            ["executados", `Executados (${executed.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tab === value
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-text-muted hover:bg-bg-elev-2",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "agendados" &&
        (scheduledGroups.length === 0 ? (
          <Empty
            icon={CalendarClock}
            title="Nenhum pagamento agendado"
            description="Ao executar uma cotação com pagamento parcial, o restante agendado aparece aqui."
          />
        ) : (
          <div className="space-y-4">
            {scheduledGroups.map((g) => (
              <Card key={g.key} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm font-semibold">
                  <span className={cn(g.key === "late" && "text-danger")}>{g.title}</span>
                  <Money value={g.list.reduce((s, p) => s + p.amount, 0)} size="sm" />
                </div>
                <ul className="divide-y divide-border">
                  {g.list.map((p) => {
                    const late = p.due_date !== null && p.due_date < today;
                    const isToday = p.due_date === today;
                    return (
                      <li
                        key={p.id}
                        className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{p.item_name}</p>
                            <SupplierLink id={p.supplier_id} name={p.supplier_name} />
                            <p
                              className={cn(
                                "text-[11px]",
                                late
                                  ? "font-medium text-danger"
                                  : isToday
                                    ? "font-medium text-warning"
                                    : "text-text-muted",
                              )}
                            >
                              {p.label} ·{" "}
                              {p.due_date === null
                                ? "sem data"
                                : late
                                  ? `venceu ${fmtDate(p.due_date, "dd/MM/yyyy")}`
                                  : isToday
                                    ? "vence hoje"
                                    : `vence ${fmtDate(p.due_date, "dd/MM/yyyy")}`}
                            </p>
                          </div>
                          <Money value={p.amount} size="sm" className="shrink-0 font-medium" />
                        </div>
                        {canWrite && (
                          <div className="flex shrink-0 items-center justify-end gap-1.5">
                            <AmountEditor
                              value={p.amount}
                              label={p.label}
                              disabled={busy !== null}
                              onSave={(amount) => changeAmount(p, amount)}
                            />
                            <DateButton
                              value={p.due_date}
                              label={p.label}
                              disabled={busy !== null}
                              showLabel
                              onChange={(date) => reschedule(p, date)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 min-w-16 px-3 text-xs"
                              disabled={busy !== null}
                              onClick={() => setPaying(p)}
                            >
                              Pagar
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>
        ))}

      {tab === "executados" &&
        (executedGroups.length === 0 ? (
          <Empty
            icon={Wallet}
            title="Nada pago ainda"
            description="Despesas executadas e parcelas pagas aparecem aqui."
          />
        ) : (
          <div className="space-y-4">
            {executedGroups.map((g) => (
              <Card key={g.month} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm font-semibold">
                  <span className="capitalize">{g.title}</span>
                  <Money value={g.total} size="sm" />
                </div>
                <ul className="divide-y divide-border">
                  {g.list.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.name}</p>
                        <SupplierLink id={e.supplier_id} name={e.supplier_name} />
                        <p className="text-[11px] text-text-muted">
                          {e.payment_label && <>{e.payment_label} · </>}pago em{" "}
                          {fmtDate(e.date, "dd/MM/yyyy")}
                        </p>
                      </div>
                      <Money value={e.amount} size="sm" className="shrink-0" />
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => setFixing(e)}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-primary hover:bg-bg-elev-2"
                          aria-label={`Corrigir pagamento de ${e.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Corrigir</span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
            <p className="text-center text-xs text-text-muted">
              Toque no lápis pra corrigir valor ou data, reagendar ou cancelar o restante, ou
              desfazer. Pra apagar de vez, use o{" "}
              <Link href="/overview/gasto" className="text-primary hover:underline">
                Gasto
              </Link>
              .
            </p>
          </div>
        ))}
      {paying && (
        <PayDialog
          payment={paying}
          title={paying.item_name}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            router.refresh();
          }}
        />
      )}
      {fixing && (
        <CorrectPaymentDialog
          item={{
            id: fixing.id,
            name: fixing.name,
            amount: fixing.amount,
            date: fixing.date,
            fromQuote: !!fixing.quote_id,
          }}
          onClose={() => setFixing(null)}
          onDone={() => {
            setFixing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
