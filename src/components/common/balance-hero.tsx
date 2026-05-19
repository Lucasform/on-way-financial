import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";

interface BalanceHeroProps {
  balance: number;
  income: number;
  expense: number;
  spark: { value: number }[];
}

export function BalanceHero({ balance, income, expense, spark }: BalanceHeroProps) {
  const positive = balance >= 0;
  return (
    <section className="surface-elevated relative overflow-hidden p-6 sm:p-8">
      {/* Decorative gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-50 blur-3xl"
        style={{
          background: positive
            ? "radial-gradient(closest-side, rgba(0,209,160,0.35), transparent)"
            : "radial-gradient(closest-side, rgba(239,68,68,0.30), transparent)",
        }}
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Saldo do mês</p>
          <Money
            value={balance}
            tone={positive ? "default" : "danger"}
            className="num mt-1 block text-[36px] font-semibold leading-none sm:text-[44px]"
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                <ArrowDown className="h-3 w-3" />
              </span>
              Entradas <Money value={income} tone="success" size="sm" className="num" />
            </span>
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/15 text-danger">
                <ArrowUp className="h-3 w-3" />
              </span>
              Saídas <Money value={expense} tone="danger" size="sm" className="num" />
            </span>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="hidden sm:block sm:w-48">
            <Sparkline data={spark} tone={positive ? "primary" : "danger"} height={50} />
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/transactions/new">
                <Plus className="h-4 w-4" /> Nova
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/transactions">Ver tudo</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
