import { ArrowDownRight, ArrowUpRight, Boxes, CalendarDays } from "lucide-react";

import { CategoryDonut } from "@/components/charts/category-donut";
import { DailyBars } from "@/components/charts/daily-bars";
import { RecentTransactions } from "@/components/transactions/recent-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Empty } from "@/components/ui/empty";
import { loadActiveContext } from "@/lib/household";
import { monthRangeISO, previousMonthRange, todayISO } from "@/lib/dates";
import { format } from "date-fns";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { start, end } = monthRangeISO();
  const prev = previousMonthRange();
  const prevStart = format(prev.start, "yyyy-MM-dd");
  const prevEnd = format(prev.end, "yyyy-MM-dd");

  const [{ data: txMonth }, { data: txPrev }, { data: cards }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_at, description, category_id, payment_method_id, categories:categories(name,color,icon), payment_methods:payment_methods(name,kind)")
      .eq("household_id", ctx.householdId)
      .gte("occurred_at", start)
      .lte("occurred_at", end)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("type, amount")
      .eq("household_id", ctx.householdId)
      .gte("occurred_at", prevStart)
      .lte("occurred_at", prevEnd),
    supabase
      .from("payment_methods")
      .select("id, name, closing_day, due_day")
      .eq("household_id", ctx.householdId)
      .eq("kind", "credit_card")
      .is("archived_at", null),
  ]);

  const list = txMonth ?? [];
  const income = sumByType(list, "income");
  const expense = sumByType(list, "expense");
  const balance = income - expense;
  const prevExpense = sumByType(txPrev ?? [], "expense");
  const variation = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0;

  const byCategory = new Map<string, { name: string; total: number; color: string }>();
  for (const tx of list) {
    if (tx.type !== "expense") continue;
    const cat = (tx as { categories: { name: string; color: string | null } | null }).categories;
    const key = cat?.name ?? "Outros";
    const entry = byCategory.get(key) ?? { name: key, total: 0, color: cat?.color ?? "#9CA3AF" };
    entry.total += Number(tx.amount);
    byCategory.set(key, entry);
  }
  const byCategoryArr = [...byCategory.values()].sort((a, b) => b.total - a.total);
  const topCategory = byCategoryArr[0];

  const byDay = aggregateByDay(list.filter((t) => t.type === "expense"));

  const upcomingInvoices = (cards ?? [])
    .filter((c) => c.closing_day != null)
    .map((c) => {
      const today = new Date(todayISO());
      const day = c.closing_day!;
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      if (date < today) date.setMonth(date.getMonth() + 1);
      const daysTo = Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
      return { name: c.name, date, daysTo };
    })
    .filter((c) => c.daysTo <= 7)
    .sort((a, b) => a.daysTo - b.daysTo);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Visão geral</h1>
        <p className="text-sm text-text-muted">Mês atual — {format(new Date(), "MMMM yyyy")}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Saldo do mês</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Money value={balance} size="xl" tone={balance >= 0 ? "success" : "danger"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Gastos do mês</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Money value={expense} size="xl" />
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted">
              {variation >= 0 ? <ArrowUpRight className="h-3 w-3 text-danger" /> : <ArrowDownRight className="h-3 w-3 text-success" />}
              {Math.abs(variation).toFixed(1)}% vs mês passado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Maior categoria</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="truncate text-lg font-semibold">{topCategory?.name ?? "—"}</p>
            <Money value={topCategory?.total ?? 0} size="sm" tone="muted" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Próximas faturas</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {upcomingInvoices.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhuma nos próximos 7 dias.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {upcomingInvoices.slice(0, 2).map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="truncate">{c.name}</span>
                    <span className="text-text-muted"><CalendarDays className="mr-1 inline h-3 w-3" />{c.daysTo}d</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Gastos por dia</CardTitle></CardHeader>
          <CardContent className="h-64"><DailyBars data={byDay} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Por categoria</CardTitle></CardHeader>
          <CardContent className="h-64">
            {byCategoryArr.length === 0 ? (
              <Empty icon={Boxes} title="Sem despesas neste mês" description="Aposto que você está economizando 🤑" />
            ) : (
              <CategoryDonut data={byCategoryArr} />
            )}
          </CardContent>
        </Card>
      </section>

      <RecentTransactions transactions={list.slice(0, 10)} />
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
