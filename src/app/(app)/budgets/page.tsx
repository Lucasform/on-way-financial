import { Card, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { brl, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, limit_amount, categories(id, name, color)")
    .eq("household_id", ctx!.householdId!)
    .eq("period_month", monthStart);

  const { data: txs } = await supabase
    .from("transactions")
    .select("category_id, amount, type")
    .eq("household_id", ctx!.householdId!)
    .eq("type", "expense")
    .gte("occurred_on", monthStart);

  const spentByCat = new Map<string, number>();
  (txs ?? []).forEach((t) => {
    if (!t.category_id) return;
    spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + Number(t.amount));
  });

  const list = budgets ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>

      {list.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            Defina limites mensais por categoria para acompanhar gastos em tempo real.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((b) => {
            const cat = b.categories as any;
            const spent = spentByCat.get(cat?.id) ?? 0;
            const used = Number(b.limit_amount) > 0 ? (spent / Number(b.limit_amount)) * 100 : 0;
            return (
              <Card key={b.id}>
                <CardTitle>{cat?.name ?? "—"}</CardTitle>
                <div className="mt-2 flex items-end justify-between">
                  <span className="num text-lg font-semibold">{brl(spent)}</span>
                  <span className="text-xs text-muted">de {brl(Number(b.limit_amount))}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${used > 100 ? "bg-danger" : used > 80 ? "bg-warning" : "bg-success"}`}
                    style={{ width: `${Math.min(used, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{pct(used)} usado</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
