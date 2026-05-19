import Link from "next/link";
import { Plus } from "lucide-react";

import { GroupedTransactionList } from "@/components/transactions/grouped-list";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { PREVIEW_TRANSACTIONS } from "@/lib/preview-data";

export default function PreviewTransactionsPage() {
  const txs = PREVIEW_TRANSACTIONS;
  const incomeSum = txs.filter((r) => r.type === "income").reduce((a, r) => a + r.amount, 0);
  const expenseSum = txs.filter((r) => r.type === "expense").reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Transações</h1>
          <p className="text-sm text-text-muted">{txs.length} registros nos últimos 30 dias</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Nova transação
        </Button>
      </header>

      <section className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <Total label="Entradas" value={incomeSum} tone="success" />
        <Total label="Saídas" value={expenseSum} tone="danger" />
        <Total
          label="Saldo"
          value={incomeSum - expenseSum}
          tone={incomeSum - expenseSum >= 0 ? "success" : "danger"}
        />
      </section>

      <GroupedTransactionList transactions={txs as never} />
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" }) {
  return (
    <div className="surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <Money value={value} tone={tone} className="num mt-1 block text-base font-medium" />
    </div>
  );
}
