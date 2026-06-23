import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { NewProject } from "@/components/obra/new-project";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { brl, pct } from "@/lib/utils";
import { HardHat } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ObraPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();

  const { data: projects } = await supabase
    .from("construction_projects")
    .select("id, name, status, budget_total, expected_end_date")
    .eq("household_id", ctx!.householdId!)
    .order("created_at", { ascending: false });

  const list = projects ?? [];

  // gasto realizado por projeto
  const { data: spentRows } = await supabase
    .from("construction_expenses")
    .select("project_id, amount")
    .eq("household_id", ctx!.householdId!);
  const spentByProject = new Map<string, number>();
  (spentRows ?? []).forEach((r) => {
    spentByProject.set(r.project_id, (spentByProject.get(r.project_id) ?? 0) + Number(r.amount));
  });

  const totalBudget = list.reduce((s, p) => s + Number(p.budget_total), 0);
  const totalSpent = [...spentByProject.values()].reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Obra</h1>
          <p className="text-sm text-fg-soft">Orçamento, etapas e despesas da construção.</p>
        </div>
        <NewProject householdId={ctx!.householdId!} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orçamento total" value={brl(totalBudget)} />
        <Stat label="Gasto realizado" value={brl(totalSpent)} tone="danger" />
        <Stat
          label="Saldo de obra"
          value={brl(totalBudget - totalSpent)}
          tone={totalBudget - totalSpent >= 0 ? "success" : "danger"}
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <HardHat className="h-6 w-6" />
            </div>
            <p className="text-sm text-fg-soft">
              Nenhuma obra cadastrada. Crie um projeto para controlar etapas, orçamento e despesas.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((p) => {
            const spent = spentByProject.get(p.id) ?? 0;
            const used = Number(p.budget_total) > 0 ? (spent / Number(p.budget_total)) * 100 : 0;
            return (
              <Link key={p.id} href={`/obra/${p.id}`} className="block transition hover:-translate-y-0.5">
              <Card>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.name}</CardTitle>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-soft">
                    {p.status}
                  </span>
                </div>
                <p className="num mt-3 text-xl font-semibold">{brl(spent)}</p>
                <p className="text-xs text-muted">de {brl(Number(p.budget_total))}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${used > 100 ? "bg-danger" : "bg-brand"}`}
                    style={{ width: `${Math.min(used, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{pct(used)} do orçamento usado</p>
              </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
