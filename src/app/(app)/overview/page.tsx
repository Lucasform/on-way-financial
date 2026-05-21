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

import { FeaturedModule, type FeaturedModuleData } from "@/components/modules/featured-module";

import { CategoryDonut } from "@/components/charts/category-donut";
import { DailyBars } from "@/components/charts/daily-bars";
import { BalanceHero } from "@/components/common/balance-hero";
import { CategoryIcon } from "@/components/common/category-icon";
import { KpiCard } from "@/components/common/kpi-card";
import { MonthPicker } from "@/components/common/month-picker";
import { RealtimeRefresher } from "@/components/common/realtime-refresher";
import { GroupedTransactionList } from "@/components/transactions/grouped-list";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Money } from "@/components/ui/money";
import { loadActiveContext } from "@/lib/household";
import { addMonths, fmtDate, format, isAfter, isBefore, parseISO, todayISO } from "@/lib/dates";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SearchParams {
  month?: string;
  view?: "all" | "month";
}

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();

  const isAllTime = searchParams.view === "all";
  const today = new Date(todayISO());
  const monthRef = searchParams.month ? parseISO(searchParams.month) : today;
  const monthStart = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1);
  const monthEnd = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0);
  const prevStart = new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1);
  const prevEnd = new Date(monthRef.getFullYear(), monthRef.getMonth(), 0);

  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");
  const prevStartStr = format(prevStart, "yyyy-MM-dd");
  const prevEndStr = format(prevEnd, "yyyy-MM-dd");

  // Geral usa um range amplo (10 anos pra tras ate hoje)
  const allStartStr = format(new Date(today.getFullYear() - 10, 0, 1), "yyyy-MM-dd");
  const filterStartStr = isAllTime ? allStartStr : monthStartStr;
  const filterEndStr = isAllTime ? format(today, "yyyy-MM-dd") : monthEndStr;

  // 90 dias atrás pra sparklines
  const sparkFromStr = format(addMonths(monthStart, -3), "yyyy-MM-dd");

  const [txMonth, txPrev, txSpark, cards, modulesData] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, amount, occurred_at, description, category_id, payment_method_id, source, notes, installment_number, installments_total, categories:categories(name,color,icon), payment_methods:payment_methods(name,kind)",
      )
      .eq("household_id", ctx.householdId)
      .gte("occurred_at", filterStartStr)
      .lte("occurred_at", filterEndStr)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("type, amount")
      .eq("household_id", ctx.householdId)
      .gte("occurred_at", prevStartStr)
      .lte("occurred_at", prevEndStr),
    supabase
      .from("transactions")
      .select("type, amount, occurred_at")
      .eq("household_id", ctx.householdId)
      .gte("occurred_at", sparkFromStr)
      .lte("occurred_at", monthEndStr),
    supabase
      .from("payment_methods")
      .select("id, name, closing_day, due_day, credit_limit")
      .eq("household_id", ctx.householdId)
      .eq("kind", "credit_card")
      .is("archived_at", null),
    supabase
      .from("modules")
      .select("id, kind, name, status, budget, start_date, end_date")
      .eq("household_id", ctx.householdId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const activeModules = (modulesData.data ?? []) as Array<{
    id: string;
    kind: string;
    name: string;
    status: string;
    budget: number | null;
    start_date: string | null;
    end_date: string | null;
  }>;

  // Totais por módulo
  const moduleIds = activeModules.map((m) => m.id);
  const moduleTotals: Record<string, number> = {};
  if (moduleIds.length > 0) {
    const { data: agg } = await supabase
      .from("transactions")
      .select("module_id, amount")
      .in("module_id", moduleIds)
      .eq("type", "expense");
    for (const r of (agg ?? []) as Array<{ module_id: string | null; amount: number | string }>) {
      if (r.module_id) moduleTotals[r.module_id] = (moduleTotals[r.module_id] ?? 0) + Number(r.amount);
    }
  }

  const featuredModulesData: FeaturedModuleData[] = activeModules.map((m) => ({
    ...m,
    used: moduleTotals[m.id] ?? 0,
  }));

  const list = (txMonth.data ?? []) as Array<{
    id: string;
    type: string;
    amount: number | string;
    description: string | null;
    occurred_at: string;
    source: string;
    notes: string | null;
    installment_number: number | null;
    installments_total: number | null;
    categories: { name: string; color: string | null; icon: string | null } | null;
    payment_methods: { name: string; kind: string } | null;
  }>;

  const income = sumByType(list, "income");
  const expense = sumByType(list, "expense");
  const balance = income - expense;
  const prevExpense = sumByType((txPrev.data ?? []) as Array<{ type: string; amount: number | string }>, "expense");
  const prevIncome = sumByType((txPrev.data ?? []) as Array<{ type: string; amount: number | string }>, "income");
  const deltaExpense = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null;
  const deltaIncome = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : null;

  // Sparkline (90 dias agrupado por mês de gastos)
  const sparkMap = new Map<string, number>();
  for (const t of (txSpark.data ?? []) as Array<{ type: string; amount: number | string; occurred_at: string }>) {
    if (t.type !== "expense") continue;
    const key = t.occurred_at.slice(0, 7); // YYYY-MM
    sparkMap.set(key, (sparkMap.get(key) ?? 0) + Number(t.amount));
  }
  const sparkExpense = [...sparkMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ value: v }));

  const sparkIncomeMap = new Map<string, number>();
  for (const t of (txSpark.data ?? []) as Array<{ type: string; amount: number | string; occurred_at: string }>) {
    if (t.type !== "income") continue;
    const key = t.occurred_at.slice(0, 7);
    sparkIncomeMap.set(key, (sparkIncomeMap.get(key) ?? 0) + Number(t.amount));
  }
  const sparkIncome = [...sparkIncomeMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ value: v }));

  const sparkBalance: { value: number }[] = [];
  const allMonths = new Set([...sparkMap.keys(), ...sparkIncomeMap.keys()]);
  [...allMonths].sort().forEach((k) => {
    sparkBalance.push({ value: (sparkIncomeMap.get(k) ?? 0) - (sparkMap.get(k) ?? 0) });
  });

  // By category
  const byCategory = new Map<string, { name: string; total: number; color: string; icon: string | null }>();
  for (const tx of list) {
    if (tx.type !== "expense") continue;
    const cat = tx.categories;
    const key = cat?.name ?? "Outros";
    const entry = byCategory.get(key) ?? {
      name: key,
      total: 0,
      color: cat?.color ?? "#9CA3AF",
      icon: cat?.icon ?? null,
    };
    entry.total += Number(tx.amount);
    byCategory.set(key, entry);
  }
  const byCategoryArr = [...byCategory.values()].sort((a, b) => b.total - a.total);
  const topCategory = byCategoryArr[0];

  // By day for bar chart
  const byDay = aggregateByDay(list.filter((t) => t.type === "expense"));

  // Upcoming invoices (≤ 14 dias)
  const upcomingInvoices = (cards.data ?? [])
    .filter((c) => c.closing_day != null)
    .map((c) => {
      const day = c.closing_day!;
      const candidates = [-1, 0, 1].map((m) => new Date(today.getFullYear(), today.getMonth() + m, day));
      const next = candidates.find((d) => !isBefore(d, today)) ?? candidates[candidates.length - 1]!;
      const daysTo = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
      return { name: c.name, date: next, daysTo, limit: c.credit_limit };
    })
    .filter((c) => c.daysTo <= 14 && c.daysTo >= 0)
    .sort((a, b) => a.daysTo - b.daysTo);

  // Savings rate
  const savingsRate = income > 0 ? Math.max(0, Math.min(100, ((income - expense) / income) * 100)) : 0;

  const isCurrentMonth = format(monthStart, "yyyy-MM") === format(today, "yyyy-MM");

  return (
    <div className="space-y-6">
      <RealtimeRefresher table="transactions" filter={`household_id=eq.${ctx.householdId}`} />
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold sm:text-3xl">Visão geral</h1>
          <p className="text-sm text-text-muted">
            {isAllTime ? "Total geral" : isCurrentMonth ? "Este mês" : "Mês selecionado"} ·{" "}
            {ctx.households.find((h) => h.id === ctx.householdId)?.name}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-end">
          <div className="inline-flex rounded-md border border-border bg-bg-elev p-0.5 text-xs">
            <Link
              href={`/overview?view=month${searchParams.month ? `&month=${searchParams.month}` : ""}`}
              className={`rounded-sm px-3 py-1.5 font-medium transition-colors ${
                !isAllTime ? "bg-bg-elev-2 text-text" : "text-text-muted hover:text-text"
              }`}
            >
              Mês
            </Link>
            <Link
              href="/overview?view=all"
              className={`rounded-sm px-3 py-1.5 font-medium transition-colors ${
                isAllTime ? "bg-bg-elev-2 text-text" : "text-text-muted hover:text-text"
              }`}
            >
              Geral
            </Link>
          </div>
          {!isAllTime && <MonthPicker value={format(monthStart, "yyyy-MM-01")} />}
        </div>
      </header>

      {/* Balance hero */}
      <BalanceHero balance={balance} income={income} expense={expense} spark={sparkBalance} />

      {/* Quick actions */}
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Entradas"
          value={income}
          icon={TrendingUp}
          tone="success"
          delta={deltaIncome}
          deltaLabel="vs mês passado"
          sparkline={sparkIncome}
          sparklineTone="success"
          animationDelay={0}
        />
        <KpiCard
          label="Saídas"
          value={expense}
          icon={TrendingDown}
          delta={deltaExpense}
          deltaLabel="vs mês passado"
          inverseDelta
          sparkline={sparkExpense}
          sparklineTone="danger"
          animationDelay={0.06}
        />
        <KpiCard
          label="Taxa de poupança"
          value={savingsRate}
          icon={PiggyBank}
          tone={savingsRate >= 20 ? "success" : "muted"}
          sparklineTone="primary"
          animationDelay={0.12}
        />
        <KpiCard
          label="Top categoria"
          value={topCategory?.total ?? 0}
          icon={Sparkles}
          tone="muted"
          deltaLabel={topCategory?.name ?? "—"}
          animationDelay={0.18}
        />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-5">
        <article className="surface-elevated col-span-3 p-5">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Gastos por dia</h2>
            <span className="text-xs text-text-muted">{fmtDate(monthStart, "MMM yyyy")}</span>
          </header>
          <div className="h-64">
            {byDay.length === 0 ? (
              <Empty icon={Wallet} title="Nada gasto neste mês" description="Adicione uma despesa pra começar a ver gráficos." />
            ) : (
              <DailyBars data={byDay} />
            )}
          </div>
        </article>

        <article className="surface-elevated col-span-2 p-5">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Por categoria</h2>
            <Link href="/categories" className="text-xs text-text-muted hover:text-text">
              gerenciar →
            </Link>
          </header>
          {byCategoryArr.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <Empty title="Sem dados" description="Sem despesas neste mês." className="border-0 p-4" />
            </div>
          ) : (
            <>
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
            </>
          )}
        </article>
      </section>

      {/* Upcoming invoices */}
      {upcomingInvoices.length > 0 && (
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
      )}

      {/* Módulo em destaque */}
      <FeaturedModule modules={featuredModulesData} />

      {/* Recent transactions */}
      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Extrato do mês</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/transactions">
              Ver tudo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </header>
        {list.length === 0 ? (
          <Empty
            icon={Wallet}
            title="Sem transações neste mês"
            description="Adicione a primeira pra começar."
            action={
              <Button asChild>
                <Link href="/transactions/new">Adicionar despesa</Link>
              </Button>
            }
          />
        ) : (
          <GroupedTransactionList transactions={list.slice(0, 20)} />
        )}
      </section>
    </div>
  );
}

function sumByType(rows: { type: string; amount: number | string }[], type: string): number {
  return rows.filter((r) => r.type === type).reduce((acc, r) => acc + Number(r.amount), 0);
}

function aggregateByDay(rows: { occurred_at: string; amount: number | string }[]): { day: string; total: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.occurred_at, (map.get(r.occurred_at) ?? 0) + Number(r.amount));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, total]) => ({ day, total }));
}

// Silence unused import lint in some setups
const _silence = isAfter;
void _silence;
