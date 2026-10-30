import Link from "next/link";
import { redirect } from "next/navigation";

import type { CostRow } from "@/components/modules/obra-costs-list";
import { ObraGastoView } from "@/components/modules/obra-gasto-view";
import { ObraSectionHeader } from "@/components/modules/obra-section-header";
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

export default async function GastoPage(props: { searchParams: Promise<{ periodo?: string; de?: string; ate?: string }> }) {
  const searchParams = await props.searchParams;
  const customRange = Boolean(searchParams.de || searchParams.ate);
  const periodo = customRange ? "custom" : (searchParams.periodo ?? "tudo");

  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  let query = supabase
    .from("obra_items")
    .select("id, name, quote_id, supplier_id, supplier, quantity, unit_price, actual_unit_price, bought_at, created_at")
    .eq("module_id", mod.id)
    .eq("status", "done");

  if (customRange) {
    if (searchParams.de) query = query.gte("bought_at", searchParams.de);
    if (searchParams.ate) query = query.lte("bought_at", searchParams.ate);
  } else if (periodo === "mes") {
    const { start, end } = monthRangeISO();
    query = query.gte("bought_at", start).lte("bought_at", end);
  } else if (periodo === "mes-passado") {
    const { start, end } = previousMonthRange();
    query = query.gte("bought_at", format(start, "yyyy-MM-dd")).lte("bought_at", format(end, "yyyy-MM-dd"));
  }

  const [{ data: items }, { data: suppliers }, { data: paidPayments }] = await Promise.all([
    query,
    supabase.from("suppliers").select("id, name").eq("household_id", ctx.householdId).order("name"),
    supabase.from("quote_payments").select("item_id").eq("household_id", ctx.householdId).not("item_id", "is", null),
  ]);

  const paymentItemIds = new Set((paidPayments ?? []).map((p) => p.item_id));

  const nameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  const costs: CostRow[] = (items ?? [])
    .map((i) => ({
      id: i.id,
      name: i.name,
      supplier_id: i.supplier_id && nameById.has(i.supplier_id) ? i.supplier_id : null,
      supplier_label: (i.supplier_id && nameById.get(i.supplier_id)) || i.supplier || "Sem fornecedor",
      amount: Number(i.quantity) * Number(i.actual_unit_price ?? i.unit_price ?? 0),
      bought_at: i.bought_at,
      quote_id: i.quote_id,
      from_payment: paymentItemIds.has(i.id),
      sortKey: i.bought_at ?? i.created_at,
    }))
    .sort((a, b) => (a.supplier_id ? 1 : 0) - (b.supplier_id ? 1 : 0) || b.sortKey.localeCompare(a.sortKey))
    .map(({ sortKey: _sortKey, ...c }) => c);

  return (
    <div>
      <ObraSectionHeader title="Gasto por fornecedor" />

      <div className="mb-3 flex flex-wrap gap-2">
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

      <form
        method="get"
        className={cn(
          "mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs",
          customRange ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <span className="text-text-muted">ou escolher período:</span>
        <input
          type="date"
          name="de"
          defaultValue={searchParams.de ?? ""}
          className="h-8 rounded-md border border-border bg-bg-elev px-2"
        />
        <span className="text-text-muted">até</span>
        <input
          type="date"
          name="ate"
          defaultValue={searchParams.ate ?? ""}
          className="h-8 rounded-md border border-border bg-bg-elev px-2"
        />
        <button type="submit" className="rounded-md border border-border bg-bg-elev px-3 py-1.5 font-medium hover:bg-bg-elev-2">
          Filtrar
        </button>
        {customRange && (
          <Link href="/overview/gasto" className="text-text-muted underline">
            limpar
          </Link>
        )}
      </form>

      <ObraGastoView costs={costs} suppliers={suppliers ?? []} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
