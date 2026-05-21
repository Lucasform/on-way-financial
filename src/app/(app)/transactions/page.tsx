import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";

import { GroupedTransactionList } from "@/components/transactions/grouped-list";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Money } from "@/components/ui/money";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  from?: string;
  to?: string;
  category?: string;
  payment?: string;
  source?: string;
  module?: string;
  page?: string;
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 100;
  const fromIdx = (page - 1) * pageSize;

  let q = supabase
    .from("transactions")
    .select(
      "id, type, amount, description, occurred_at, source, notes, installment_number, installments_total, categories:categories(name,color,icon), payment_methods:payment_methods(name,kind)",
      { count: "exact" },
    )
    .eq("household_id", ctx.householdId)
    .order("occurred_at", { ascending: false })
    .range(fromIdx, fromIdx + pageSize - 1);

  if (searchParams.from) q = q.gte("occurred_at", searchParams.from);
  if (searchParams.to) q = q.lte("occurred_at", searchParams.to);
  if (searchParams.category) q = q.eq("category_id", searchParams.category);
  if (searchParams.payment) q = q.eq("payment_method_id", searchParams.payment);
  if (searchParams.source) q = q.eq("source", searchParams.source);
  if (searchParams.module) q = q.eq("module_kind", searchParams.module);
  if (searchParams.q) {
    const raw = searchParams.q.trim();
    const safe = raw.replace(/[%,()]/g, " ");
    const parts: string[] = [`description.ilike.%${safe}%`, `notes.ilike.%${safe}%`];
    const numeric = Number(raw.replace(",", "."));
    if (!Number.isNaN(numeric) && raw.length > 0) parts.push(`amount.eq.${numeric}`);
    // categorias que casam pelo nome
    const { data: catMatches } = await supabase
      .from("categories")
      .select("id")
      .eq("household_id", ctx.householdId)
      .ilike("name", `%${safe}%`);
    const catIds = (catMatches ?? []).map((c) => c.id);
    if (catIds.length > 0) parts.push(`category_id.in.(${catIds.join(",")})`);
    q = q.or(parts.join(","));
  }

  const [{ data: rows, count }, { data: categories }, { data: methods }] = await Promise.all([
    q,
    supabase.from("categories").select("id, name").eq("household_id", ctx.householdId).order("name"),
    supabase
      .from("payment_methods")
      .select("id, name")
      .eq("household_id", ctx.householdId)
      .is("archived_at", null)
      .order("name"),
  ]);

  const txs = (rows ?? []) as Array<{
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

  // Totalizadores filtrados
  const incomeSum = txs.filter((r) => r.type === "income").reduce((a, r) => a + Number(r.amount), 0);
  const expenseSum = txs.filter((r) => r.type === "expense").reduce((a, r) => a + Number(r.amount), 0);

  const hasFilters = Boolean(
    searchParams.q ||
      searchParams.from ||
      searchParams.to ||
      searchParams.category ||
      searchParams.payment ||
      searchParams.source ||
      searchParams.module,
  );

  const lastPage = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Transações</h1>
          <p className="text-sm text-text-muted">
            {count ?? 0} {(count ?? 0) === 1 ? "registro" : "registros"}
            {hasFilters && " (filtrado)"}
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="h-4 w-4" /> Nova transação
          </Link>
        </Button>
      </header>

      {/* Totais filtrados */}
      <section className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
        <Total label="Entradas" value={incomeSum} tone="success" />
        <Total label="Saídas" value={expenseSum} tone="danger" />
        <Total label="Saldo" value={incomeSum - expenseSum} tone={incomeSum - expenseSum >= 0 ? "success" : "danger"} />
      </section>

      {/* Filters */}
      <details className="surface-elevated overflow-hidden">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium select-none">
          <Filter className="h-4 w-4 text-text-muted" />
          <span>Filtros</span>
          {hasFilters && <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">ativo</span>}
        </summary>
        <div className="border-t border-border p-4">
          <TransactionFilters categories={categories ?? []} methods={methods ?? []} />
        </div>
      </details>

      {/* List */}
      {txs.length === 0 ? (
        <Empty
          icon={Search}
          title={hasFilters ? "Nada encontrado" : "Sem transações ainda"}
          description={hasFilters ? "Tente limpar os filtros." : "Adicione a primeira pra começar."}
          action={
            !hasFilters ? (
              <Button asChild>
                <Link href="/transactions/new">Adicionar despesa</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <GroupedTransactionList transactions={txs} />

          {lastPage > 1 && (
            <nav className="flex items-center justify-between pt-2 text-xs text-text-muted">
              <span>
                Página {page} de {lastPage}
              </span>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="ghost" disabled={page <= 1}>
                  <Link href={pageLink(searchParams, Math.max(1, page - 1))}>← Anterior</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" disabled={page >= lastPage}>
                  <Link href={pageLink(searchParams, Math.min(lastPage, page + 1))}>Próxima →</Link>
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" }) {
  return (
    <div className="surface min-w-0 p-2 sm:p-3">
      <p className="truncate text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <Money
        value={value}
        tone={tone}
        className="num mt-1 block truncate text-[13px] font-medium leading-tight sm:text-base"
      />
    </div>
  );
}

function pageLink(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") params.set(k, String(v));
  }
  params.set("page", String(page));
  return `/transactions?${params.toString()}`;
}
