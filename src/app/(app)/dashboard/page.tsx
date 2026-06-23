import { Stat } from "@/components/ui/stat";
import { Card, CardTitle } from "@/components/ui/card";
import { CategoryDonut, CashflowBar } from "@/components/charts";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { brl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function DashboardPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: all } = await supabase
    .from("transactions")
    .select("type, amount, description, occurred_on, source, category_id, categories(name, color)")
    .eq("household_id", hid)
    .gte("occurred_on", sixAgo.toISOString().slice(0, 10))
    .order("occurred_on", { ascending: false });

  const rows = all ?? [];
  const monthRows = rows.filter((t) => new Date(t.occurred_on) >= monthStart);
  const income = monthRows.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthRows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  // gastos por categoria no mês
  const byCat = new Map<string, { name: string; value: number; color: string }>();
  monthRows
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const c = t.categories as any;
      const key = c?.name ?? "Sem categoria";
      const prev = byCat.get(key);
      byCat.set(key, {
        name: key,
        value: (prev?.value ?? 0) + Number(t.amount),
        color: c?.color ?? "#64748b",
      });
    });
  const donut = [...byCat.values()].sort((a, b) => b.value - a.value).slice(0, 8);

  // fluxo 6 meses
  const flow: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = rows.filter((t) => {
      const td = new Date(t.occurred_on);
      return td >= d && td < next;
    });
    flow.push({
      month: MONTHS[d.getMonth()],
      income: inMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-fg-soft">
          {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Entradas do mês" value={brl(income)} tone="success" />
        <Stat label="Saídas do mês" value={brl(expense)} tone="danger" />
        <Stat label="Saldo do mês" value={brl(income - expense)} tone={income - expense >= 0 ? "success" : "danger"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Fluxo dos últimos 6 meses</CardTitle>
          <div className="mt-3">
            <CashflowBar data={flow} />
          </div>
        </Card>
        <Card>
          <CardTitle>Gastos por categoria (mês)</CardTitle>
          <div className="mt-3">
            <CategoryDonut data={donut} />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Lançamentos recentes</CardTitle>
        {monthRows.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            Nenhum lançamento ainda. Use “Lançar com IA” ou mande no WhatsApp/Telegram.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {monthRows.slice(0, 8).map((t, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description || "—"}</p>
                  <p className="text-xs text-muted">
                    {new Date(t.occurred_on).toLocaleDateString("pt-BR")} · {t.source}
                  </p>
                </div>
                <span className={`num text-sm font-semibold ${t.type === "income" ? "text-success" : "text-danger"}`}>
                  {t.type === "income" ? "+" : "-"}
                  {brl(Number(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
