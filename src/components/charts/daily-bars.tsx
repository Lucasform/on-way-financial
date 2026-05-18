"use client";

import { format, parseISO } from "date-fns";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatBRLCompact } from "@/lib/money";

interface DailyBarsProps {
  data: { day: string; total: number }[];
}

export function DailyBars({ data }: DailyBarsProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 8 }}>
        <XAxis
          dataKey="day"
          stroke="var(--text-muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(d: string) => format(parseISO(d), "dd")}
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
          cursor={{ fill: "rgba(0,209,160,0.08)" }}
          contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }}
          labelFormatter={(d) => format(parseISO(String(d)), "dd/MM")}
          formatter={(v: number) => formatBRLCompact(v)}
        />
        <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
