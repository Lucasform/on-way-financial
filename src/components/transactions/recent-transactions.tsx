import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Money } from "@/components/ui/money";
import { fmtRelative } from "@/lib/dates";

interface Tx {
  id: string;
  type: string;
  amount: number | string;
  description: string | null;
  occurred_at: string;
  categories: { name: string; color: string | null } | null;
  payment_methods: { name: string; kind: string } | null;
}

export function RecentTransactions({ transactions }: { transactions: Tx[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Últimas transações</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/transactions">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {transactions.length === 0 ? (
          <Empty
            icon={ReceiptText}
            title="Sem transações ainda"
            description="Quando você registrar uma despesa ela aparecerá aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description ?? t.categories?.name ?? "Transação"}</p>
                  <p className="text-xs text-text-muted">
                    {t.categories?.name ?? "Sem categoria"} · {t.payment_methods?.name ?? "—"} · {fmtRelative(t.occurred_at)}
                  </p>
                </div>
                <Money value={Number(t.amount)} tone={t.type === "income" ? "success" : "default"} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
