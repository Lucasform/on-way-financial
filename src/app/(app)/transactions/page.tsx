import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";

import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
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
  const pageSize = 50;
  const fromIdx = (page - 1) * pageSize;

  let q = supabase
    .from("transactions")
    .select(
      "id, type, amount, description, occurred_at, source, categories:categories(name,color), payment_methods:payment_methods(name,kind)",
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
  if (searchParams.q) q = q.ilike("description", `%${searchParams.q}%`);

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

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm text-text-muted">{count ?? 0} registros</p>
        </div>
        <Button asChild>
          <Link href="/transactions/new"><Plus className="h-4 w-4" /> Nova</Link>
        </Button>
      </header>

      <Card className="p-4">
        <TransactionFilters categories={categories ?? []} methods={methods ?? []} />
      </Card>

      {(!rows || rows.length === 0) ? (
        <Empty icon={ReceiptText} title="Nada encontrado" description="Tente limpar os filtros ou adicionar uma nova transação." />
      ) : (
        <TransactionsTable rows={rows} page={page} pageSize={pageSize} total={count ?? 0} />
      )}
    </div>
  );
}
