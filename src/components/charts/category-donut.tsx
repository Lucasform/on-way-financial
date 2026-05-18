"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatBRL } from "@/lib/money";

interface CategoryDonutProps {
  data: { name: string; total: number; color: string }[];
}

export function CategoryDonut({ data }: CategoryDonutProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="name" innerRadius={48} outerRadius={86} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }}
          formatter={(v: number) => formatBRL(v)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
