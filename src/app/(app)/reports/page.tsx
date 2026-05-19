import { Activity, BarChart3, PiggyBank, TrendingDown, TrendingUp, Trophy } from "lucide-react";

import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { CategoryIcon } from "@/components/common/category-icon";
import { KpiCard } from "@/components/common/kpi-card";
import { Empty } from "@/components/ui/empty";
import { Money } from "@/components/ui/money";
import { loadActiveContext } from "@/lib/household";
import { addMonths, format, todayISO } from "@/lib/dates";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TxRow {
  type: string;
  amount: number | string;
  occurred_at: string;
  description: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  categories: { name: string; color: string | null; icon: string | null } | null;
  payment_methods: { name: string; kind: string } | null;
}

export default async function ReportsPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();

  const today = new Date(todayISO());
  const startStr = format(addMonths(today, -11), "yyyy-MM-01");

  const { data } = await supabase
    .from("transactions")
    .select(
      "type, amount, occurred_at, description, category_id, payment_method_id, categories:categories(name,color,icon), payment_methods:payment_methods(name,kind)",
    )
    .eq("household_id", ctx.householdId)
    .gte("occurred_at", startStr);

  const rows = (data ?? []) as TxRow[];

  // Monthly trend (12 meses)
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) months.push(format(addMonths(today, -i), "yyyy-MM"));
  const trendMap = new Map<string, { income: number; expense: number }>();
  for (const m of months) trendMap.set(m, { income: 0, expense: 0 });
  for (const r of rows) {
    const key = r.occurred_at.slice(0, 7);
    const entry = trendMap.get(key);
    if (!entry) continue;
    const v = Number(r.amount);
    if (r.type === "income") entry.income += v;
    if (r.type === "expense") entry.expense += v;
  }
  const trend = [...trendMap.entries()].map(([month, vals]) => ({ month, ...vals }));

  const totalIncome = trend.reduce((a, t) => a + t.income, 0);
  const totalExpense = trend.reduce((a, t) => a + t.expense, 0);
  const totalBalance = totalIncome - totalExpense;
  const monthsActive = trend.filter((t) => t.income + t.expense > 0).length || 1;
  const avgMonthlyExpense = totalExpense / monthsActive;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Top categorias (12 meses)
  const byCategory = new Map<string, { name: string; total: number; color: string; icon: string | null; count: number }>();
  for (const r of rows) {
    if (r.type !== "expense") continue;
    const cat = r.categories;
    const key = cat?.name ?? "Outros";
    const entry =
      byCategory.get(key) ?? { name: key, total: 0, color: cat?.color ?? "#9CA3AF", icon: cat?.icon ?? null, count: 0 };
    entry.total += Number(r.amount);
    entry.count += 1;
    byCategory.set(key, entry);
  }
  const topCategories = [...byCategory.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  const topMax = topCategories[0]?.total ?? 0;

  // Top métodos
  const byPayment = new Map<string, { name: string; total: number; count: number }>();
  for (const r of rows) {
    if (r.type !== "expense") continue;
    const pm = r.payment_methods;
    if (!pm) continue;
    const entry = byPayment.get(pm.name) ?? { name: pm.name, total: 0, count: 0 };
    entry.total += Number(r.amount);
    entry.count += 1;
    byPayment.set(pm.name, entry);
  }
  const topPayments = [...byPayment.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  // Maiores despesas individuais
  const biggestExpenses = rows
    .filter((r) => r.type === "expense")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Relatórios</h1>
        <p className="text-sm text-text-muted">Análise dos últimos 12 meses · {ctx.households.find((h) => h.id === ctx.householdId)?.name}</p>
      </header>

      {/* KPIs 12 meses */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Entradas (12 m)" value={totalIncome} icon={TrendingUp} tone="success" />
        <KpiCard label="Saídas (12 m)" value={totalExpense} icon={TrendingDown} />
        <KpiCard
          label="Média mensal"
          value={avgMonthlyExpense}
          icon={Activity}
          tone="muted"
        />
        <KpiCard
          label="Taxa de poupança"
          value={savingsRate}
          icon={PiggyBank}
          tone={savingsRate >= 20 ? "success" : savingsRate >= 10 ? "muted" : "danger"}
        />
      </section>

      {/* Trend chart */}
      <article className="surface-elevated p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Receitas vs Despesas · 12 meses</h2>
          <span className="text-xs text-text-muted">
            Balanço total:{" "}
            <Money value={totalBalance} tone={totalBalance >= 0 ? "success" : "danger"} size="sm" className="num" />
          </span>
        </header>
        <div className="h-72">
          {rows.length === 0 ? (
            <Empty icon={BarChart3} title="Sem dados" description="Adicione transações pra ver a tendência." className="border-0" />
          ) : (
            <MonthlyTrend data={trend} />
          )}
        </div>
      </article>

      {/* Two columns */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Top categorias */}
        <article className="surface-elevated p-5">
          <header className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold">Categorias que mais consomem</h2>
          </header>
          {topCategories.length === 0 ? (
            <Empty title="Sem dados" className="border-0" />
          ) : (
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
                      style={{
                        width: `${(c.total / topMax) * 100}%`,
                        background: c.color ?? "var(--primary)",
                      }}
                    />
                  </div>
                  <p className="ml-11 text-[10px] text-text-muted">{c.count} transações</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Top métodos */}
        <article className="surface-elevated p-5">
          <header className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Métodos de pagamento</h2>
          </header>
          {topPayments.length === 0 ? (
            <Empty title="Sem dados" className="border-0" />
          ) : (
            <ul className="space-y-3">
              {topPayments.map((p) => {
                const pct = totalExpense > 0 ? (p.total / totalExpense) * 100 : 0;
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
          )}
        </article>
      </section>

      {/* Biggest expenses */}
      <article className="surface-elevated p-5">
        <header className="mb-4">
          <h2 className="text-sm font-semibold">Maiores despesas individuais (12 meses)</h2>
        </header>
        {biggestExpenses.length === 0 ? (
          <Empty title="Sem dados" className="border-0" />
        ) : (
          <ul className="divide-y divide-border">
            {biggestExpenses.map((t, idx) => (
              <li key={idx} className="flex items-center gap-3 py-3">
                <CategoryIcon icon={t.categories?.icon} color={t.categories?.color} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.description ?? t.categories?.name ?? "Despesa"}</p>
                  <p className="text-xs text-text-muted">
                    {t.categories?.name ?? "—"} · {t.payment_methods?.name ?? "—"} · {format(new Date(t.occurred_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <Money value={Number(t.amount)} size="sm" className="num font-medium" />
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
