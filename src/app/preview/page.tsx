import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { CategoryDonut } from "@/components/charts/category-donut";
import { DailyBars } from "@/components/charts/daily-bars";
import { BalanceHero } from "@/components/common/balance-hero";
import { CategoryIcon } from "@/components/common/category-icon";
import { KpiCard } from "@/components/common/kpi-card";
import { QuickActions } from "@/components/common/quick-actions";
import { GroupedTransactionList } from "@/components/transactions/grouped-list";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { fmtDate, format, todayISO } from "@/lib/dates";
import {
  PREVIEW_CARDS,
  PREVIEW_HOUSEHOLD_NAME,
  PREVIEW_TRANSACTIONS,
} from "@/lib/preview-data";

export default function PreviewOverviewPage() {
  const today = new Date(todayISO());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = format(monthStart, "yyyy-MM-dd");

  const monthTxs = PREVIEW_TRANSACTIONS.filter((t) => t.occurred_at >= monthStartStr);

  const income = monthTxs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = monthTxs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;

  // Sparkline mock
  const sparkBalance = [
    { value: 4200 }, { value: 3800 }, { value: 4500 }, { value: 5100 },
    { value: 4700 }, { value: 4900 }, { value: balance },
  ];
  const sparkIncome = [
    { value: 8200 }, { value: 8500 }, { value: 8500 }, { value: 9100 }, { value: 9700 }, { value: income },
  ];
  const sparkExpense = [
    { value: 3400 }, { value: 4100 }, { value: 4000 }, { value: 4200 }, { value: 4500 }, { value: expense },
  ];

  // By category
  const byCategory = new Map<string, { name: string; total: number; color: string; icon: string }>();
  for (const tx of monthTxs) {
    if (tx.type !== "expense") continue;
    const key = tx.categories.name;
    const entry = byCategory.get(key) ?? { name: key, total: 0, color: tx.categories.color, icon: tx.categories.icon };
    entry.total += tx.amount;
    byCategory.set(key, entry);
  }
  const byCategoryArr = [...byCategory.values()].sort((a, b) => b.total - a.total);
  const topCategory = byCategoryArr[0];

  // By day
  const byDayMap = new Map<string, number>();
  for (const tx of monthTxs) {
    if (tx.type !== "expense") continue;
    byDayMap.set(tx.occurred_at, (byDayMap.get(tx.occurred_at) ?? 0) + tx.amount);
  }
  const byDay = [...byDayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, total]) => ({ day, total }));

  // Upcoming cards
  const upcomingInvoices = PREVIEW_CARDS.map((c) => {
    const day = c.closing_day;
    const candidates = [-1, 0, 1].map((m) => new Date(today.getFullYear(), today.getMonth() + m, day));
    const next = candidates.find((d) => d.getTime() >= today.getTime()) ?? candidates[candidates.length - 1]!;
    const daysTo = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
    return { name: c.name, date: next, daysTo };
  }).filter((c) => c.daysTo <= 14);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Visão geral</h1>
          <p className="text-sm text-text-muted">
            Este mês · {PREVIEW_HOUSEHOLD_NAME}
          </p>
        </div>
      </header>

      <BalanceHero balance={balance} income={income} expense={expense} spark={sparkBalance} />

      <QuickActions />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Entradas"
          value={income}
          icon={TrendingUp}
          tone="success"
          delta={12.5}
          deltaLabel="vs mês passado"
          sparkline={sparkIncome}
          sparklineTone="success"
        />
        <KpiCard
          label="Saídas"
          value={expense}
          icon={TrendingDown}
          delta={-4.2}
          deltaLabel="vs mês passado"
          inverseDelta
          sparkline={sparkExpense}
          sparklineTone="danger"
        />
        <KpiCard
          label="Taxa de poupança"
          value={savingsRate}
          icon={PiggyBank}
          tone={savingsRate >= 20 ? "success" : "muted"}
        />
        <KpiCard
          label="Top categoria"
          value={topCategory?.total ?? 0}
          icon={Sparkles}
          tone="muted"
          deltaLabel={topCategory?.name ?? "—"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <article className="surface-elevated col-span-3 p-5">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Gastos por dia</h2>
            <span className="text-xs text-text-muted">{fmtDate(monthStart, "MMM yyyy")}</span>
          </header>
          <div className="h-64">
            <DailyBars data={byDay} />
          </div>
        </article>

        <article className="surface-elevated col-span-2 p-5">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Por categoria</h2>
          </header>
          <div className="h-40">
            <CategoryDonut data={byCategoryArr} />
          </div>
          <ul className="mt-4 space-y-2.5">
            {byCategoryArr.slice(0, 5).map((c) => (
              <li key={c.name} className="flex items-center gap-3 text-sm">
                <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                <span className="flex-1 truncate text-text">{c.name}</span>
                <Money value={c.total} size="sm" className="num text-text-soft" />
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="surface-elevated p-5">
        <header className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold">Faturas nas próximas 2 semanas</h2>
        </header>
        <ul className="grid gap-2 sm:grid-cols-2">
          {upcomingInvoices.map((c) => (
            <li key={c.name} className="surface flex items-center gap-3 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-warning">
                <CreditCard className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-text-muted">
                  fecha em {c.daysTo} {c.daysTo === 1 ? "dia" : "dias"} · {fmtDate(c.date, "dd/MM")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Extrato do mês</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/preview/transactions">
              Ver tudo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </header>
        <GroupedTransactionList transactions={monthTxs.slice(0, 15) as never} />
      </section>
    </div>
  );
}
