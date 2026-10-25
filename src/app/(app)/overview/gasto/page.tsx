import Link from "next/link";
import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { format, monthRangeISO, previousMonthRange } from "@/lib/dates";
import { loadActiveContext } from "@/lib/household";
import { getObraModule } from "@/lib/obra";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PERIODS = [
  { value: "tudo", label: "Tudo" },
  { value: "mes", label: "Este mês" },
  { value: "mes-passado", label: "Mês passado" },
] as const;

export default async function GastoPage(props: { searchParams: Promise<{ periodo?: string }> }) {
  const searchParams = await props.searchParams;
  const periodo = searchParams.periodo ?? "tudo";

  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  let query = supabase
    .from("obra_items")
    .select("supplier_id, supplier, quantity, unit_price, actual_unit_price, bought_at")
    .eq("module_id", mod.id)
    .eq("status", "done");

  if (periodo === "mes") {
    const { start, end } = monthRangeISO();
    query = query.gte("bought_at", start).lte("bought_at", end);
  } else if (periodo === "mes-passado") {
    const { start, end } = previousMonthRange();
    query = query.gte("bought_at", format(start, "yyyy-MM-dd")).lte("bought_at", format(end, "yyyy-MM-dd"));
  }

  const [{ data: items }, { data: suppliers }] = await Promise.all([
    query,
    supabase.from("suppliers").select("id, name").eq("household_id", ctx.householdId),
  ]);

  const nameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  const totals = new Map<string, number>();
  for (const i of items ?? []) {
    const label = (i.supplier_id && nameById.get(i.supplier_id)) || i.supplier || "Sem fornecedor";
    const amount = Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0);
    totals.set(label, (totals.get(label) ?? 0) + amount);
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotal = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <div>
      <ObraSectionHeader title="Gasto por fornecedor" />

      <div className="mb-4 flex gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/overview/gasto?periodo=${p.value}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              periodo === p.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-text-muted hover:bg-bg-elev-2",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-text-muted">Nada gasto nesse período.</Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map(([name, total]) => (
              <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate font-medium">{name}</span>
                <Money value={total} size="sm" className="shrink-0" />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-bg-elev-2 px-4 py-3 text-sm font-semibold">
            <span>Total</span>
            <Money value={grandTotal} size="sm" />
          </div>
        </Card>
      )}
    </div>
  );
}
