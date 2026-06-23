"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { brl } from "@/lib/utils";

const tooltipStyle = {
  background: "hsl(var(--surface))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

export function CategoryDonut({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  if (data.length === 0)
    return <p className="grid h-[220px] place-items-center text-sm text-muted">Sem gastos no mês.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => brl(v)}
          contentStyle={{
            background: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CashflowBar({
  data,
}: {
  data: { month: string; income: number; expense: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4}>
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted))" }} />
        <Tooltip
          formatter={(v: number) => brl(v)}
          cursor={{ fill: "hsl(var(--surface-2))" }}
          contentStyle={{
            background: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Bar dataKey="income" name="Entradas" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" name="Saídas" fill="hsl(var(--danger))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetTrend({
  data,
}: {
  data: { month: string; net: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="netfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted))" }} />
        <Tooltip formatter={(v: number) => brl(v)} contentStyle={tooltipStyle} cursor={{ stroke: "hsl(var(--border))" }} />
        <Area type="monotone" dataKey="net" name="Saldo" stroke="hsl(var(--brand))" strokeWidth={2.5} fill="url(#netfill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
