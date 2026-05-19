"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { formatBRLCompact, formatBRL } from "@/lib/money";

interface MonthlyTrendProps {
  data: { month: string; income: number; expense: number }[];
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="var(--text-muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(m: string) => format(parseISO(`${m}-01`), "MMM", { locale: ptBR })}
        />
        <YAxis
          stroke="var(--text-muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatBRLCompact(v)}
          width={60}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 12,
          }}
          labelFormatter={(m) => format(parseISO(`${m}-01`), "MMMM yyyy", { locale: ptBR })}
          formatter={(value: number, name: string) => [formatBRL(value), name === "income" ? "Receitas" : "Despesas"]}
        />
        <Legend
          formatter={(value) => (value === "income" ? "Receitas" : "Despesas")}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Area type="monotone" dataKey="income" stroke="var(--success)" strokeWidth={2} fill="url(#grad-income)" />
        <Area type="monotone" dataKey="expense" stroke="var(--danger)" strokeWidth={2} fill="url(#grad-expense)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
