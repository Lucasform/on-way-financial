import { format, isSameDay, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

import { TransactionRow, type TxRow } from "@/components/transactions/transaction-row";
import { Money } from "@/components/ui/money";

interface GroupedListProps {
  transactions: TxRow[];
}

export function GroupedTransactionList({ transactions }: GroupedListProps) {
  if (transactions.length === 0) return null;

  // Group by occurred_at date
  const groups: { date: string; txs: TxRow[] }[] = [];
  for (const tx of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.occurred_at) {
      last.txs.push(tx);
    } else {
      groups.push({ date: tx.occurred_at, txs: [tx] });
    }
  }

  return (
    <div className="surface overflow-hidden">
      {groups.map((g, idx) => {
        const date = parseISO(g.date);
        const isFirst = idx === 0;
        const dayTotal = g.txs.reduce((acc, t) => {
          const v = Number(t.amount);
          return t.type === "income" ? acc + v : t.type === "expense" ? acc - v : acc;
        }, 0);
        return (
          <section key={g.date}>
            <header
              className={
                "flex items-center justify-between bg-bg-elev-2/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted sm:px-5 " +
                (isFirst ? "" : "border-t border-border")
              }
            >
              <span>{labelForDate(date)}</span>
              <Money
                value={Math.abs(dayTotal)}
                tone={dayTotal >= 0 ? "success" : "muted"}
                size="sm"
                className="num font-medium"
              />
            </header>
            <ul className="divide-y divide-border">
              {g.txs.map((tx) => (
                <li key={tx.id}>
                  <TransactionRow tx={tx} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function labelForDate(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  const sameYear = isSameDay(
    new Date(new Date().getFullYear(), date.getMonth(), date.getDate()),
    date,
  );
  return format(date, sameYear ? "EEEE, dd 'de' MMMM" : "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}
