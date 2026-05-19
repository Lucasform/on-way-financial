import { Activity, BarChart3, PiggyBank, TrendingDown, TrendingUp, Trophy } from "lucide-react";

import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { CategoryIcon } from "@/components/common/category-icon";
import { KpiCard } from "@/components/common/kpi-card";
import { Money } from "@/components/ui/money";
import { format } from "@/lib/dates";
import { PREVIEW_HOUSEHOLD_NAME, PREVIEW_TRANSACTIONS, PREVIEW_TREND } from "@/lib/preview-data";

export default function PreviewReportsPage() {
  const totalIncome = PREVIEW_TREND.reduce((a, t) => a + t.income, 0);
  const totalExpense = PREVIEW_TREND.reduce((a, t) => a + t.expense, 0);
  const totalBalance = totalIncome - totalExpense;
  const monthsActive = PREVIEW_TREND.length;
  const avgMonthlyExpense = totalExpense / monthsActive;
  const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;

  // Top categories from preview txs
  const byCategory = new Map<string, { name: string; total: number; color: string; icon: string; count: number }>();
  for (const r of PREVIEW_TRANSACTIONS) {
    if (r.type !== "expense") continue;
    const k = r.categories.name;
    const entry = byCategory.get(k) ?? { name: k, total: 0, color: r.categories.color, icon: r.categories.icon, count: 0 };
    entry.total += r.amount;
    entry.count += 1;
    byCategory.set(k, entry);
  }
  const topCategories = [...byCategory.values()].sort((a, b) => b.total - a.total);
  const topMax = topCategories[0]?.total ?? 0;

  const byPayment = new Map<string, { name: string; total: number; count: number }>();
  for (const r of PREVIEW_TRANSACTIONS) {
    if (r.type !== "expense") continue;
    const k = r.payment_methods.name;
    const entry = byPayment.get(k) ?? { name: k, total: 0, count: 0 };
    entry.total += r.amount;
    entry.count += 1;
    byPayment.set(k, entry);
  }
  const topPayments = [...byPayment.values()].sort((a, b) => b.total - a.total);
  const totalPayExpense = topPayments.reduce((a, p) => a + p.total, 0);

  const biggestExpenses = PREVIEW_TRANSACTIONS
    .filter((r) => r.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Relatórios</h1>
        <p className="text-sm text-text-muted">Últimos 12 meses · {PREVIEW_HOUSEHOLD_NAME}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Entradas (12 m)" value={totalIncome} icon={TrendingUp} tone="success" />
        <KpiCard label="Saídas (12 m)" value={totalExpense} icon={TrendingDown} />
        <KpiCard label="Média mensal" value={avgMonthlyExpense} icon={Activity} tone="muted" />
        <KpiCard
          label="Taxa de poupança"
          value={savingsRate}
          icon={PiggyBank}
          tone={savingsRate >= 20 ? "success" : "muted"}
        />
      </section>

      <article className="surface-elevated p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Receitas vs Despesas — 12 meses</h2>
          <span className="text-xs text-text-muted">
            Balanço total:{" "}
            <Money value={totalBalance} tone={totalBalance >= 0 ? "success" : "danger"} size="sm" className="num" />
          </span>
        </header>
        <div className="h-72">
          <MonthlyTrend data={PREVIEW_TREND} />
        </div>
      </article>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="surface-elevated p-5">
          <header className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold">Categorias que mais consomem</h2>
          </header>
          <ul className="space-y-3">
            {topCategories.map((c) => (
              <li key={c.name} className="space-y-1.5">
                <div className="flex items-center gap-3 text-sm">
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <span className="flex-1 truncate text-text">{c.name}</span>
                  <Money value={c.total} size="sm" className="num text-text-soft" />
                </div>
                <div className="ml-11 h-1.5 overflow-hidden rounded-full bg-bg-elev-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.total / topMax) * 100}%`, background: c.color }}
                  />
                </div>
                <p className="ml-11 text-[10px] text-text-muted">{c.count} transações</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="surface-elevated p-5">
          <header className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Métodos de pagamento</h2>
          </header>
          <ul className="space-y-3">
            {topPayments.map((p) => {
              const pct = totalPayExpense > 0 ? (p.total / totalPayExpense) * 100 : 0;
              return (
                <li key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text">{p.name}</span>
                    <Money value={p.total} size="sm" className="num text-text-soft" />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-elev-2">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-text-muted">
                    {pct.toFixed(1)}% · {p.count} transações
                  </p>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <article className="surface-elevated p-5">
        <header className="mb-4">
          <h2 className="text-sm font-semibold">Maiores despesas individuais</h2>
        </header>
        <ul className="divide-y divide-border">
          {biggestExpenses.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <CategoryIcon icon={t.categories.icon} color={t.categories.color} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t.description}</p>
                <p className="text-xs text-text-muted">
                  {t.categories.name} · {t.payment_methods.name} · {format(new Date(t.occurred_at), "dd/MM/yyyy")}
                </p>
              </div>
              <Money value={t.amount} size="sm" className="num font-medium" />
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
