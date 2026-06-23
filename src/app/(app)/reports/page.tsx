import { Card, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { NetTrend, CashflowBar, CategoryDonut } from "@/components/charts";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { brl, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function ReportsPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount, occurred_on, categories(name, color)")
    .eq("household_id", hid)
    .gte("occurred_on", start.toISOString().slice(0, 10));

  const rows = txs ?? [];
  const inMonth = (d: Date, n: Date) => rows.filter((t) => {
    const td = new Date(t.occurred_on);
    return td >= d && td < n;
  });

  const flow: { month: string; income: number; expense: number }[] = [];
  const net: { month: string; net: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const n = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const m = inMonth(d, n);
    const inc = m.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const exp = m.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    flow.push({ month: MONTHS[d.getMonth()], income: inc, expense: exp });
    net.push({ month: MONTHS[d.getMonth()], net: inc - exp });
  }

  const totalInc = rows.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExp = rows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;
  const avgExp = totalExp / 12;

  const byCat = new Map<string, { name: string; value: number; color: string }>();
  rows.filter((t) => t.type === "expense").forEach((t) => {
    const c = t.categories as any;
    const key = c?.name ?? "Sem categoria";
    const prev = byCat.get(key);
    byCat.set(key, { name: key, value: (prev?.value ?? 0) + Number(t.amount), color: c?.color ?? "#64748b" });
  });
  const cats = [...byCat.values()].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-fg-soft">Últimos 12 meses.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Entradas (12m)" value={brl(totalInc)} tone="success" />
        <Stat label="Saídas (12m)" value={brl(totalExp)} tone="danger" />
        <Stat label="Taxa de poupança" value={pct(savingsRate)} tone={savingsRate >= 0 ? "success" : "danger"} />
        <Stat label="Gasto médio/mês" value={brl(avgExp)} />
      </div>

      <Card>
        <CardTitle>Saldo mensal</CardTitle>
        <div className="mt-3"><NetTrend data={net} /></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Entradas × Saídas</CardTitle>
          <div className="mt-3"><CashflowBar data={flow} /></div>
        </Card>
        <Card>
          <CardTitle>Gastos por categoria</CardTitle>
          <div className="mt-3"><CategoryDonut data={cats.slice(0, 8)} /></div>
        </Card>
      </div>

      <Card>
        <CardTitle>Ranking de categorias</CardTitle>
        {cats.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Sem dados.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cats.slice(0, 12).map((c) => (
              <li key={c.name} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted">{pct(totalExp > 0 ? (c.value / totalExp) * 100 : 0)}</span>
                <span className="num w-28 text-right font-medium">{brl(c.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
