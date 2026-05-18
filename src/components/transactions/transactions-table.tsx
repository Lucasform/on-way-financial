"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { fmtDate } from "@/lib/dates";

interface Row {
  id: string;
  type: string;
  amount: number | string;
  description: string | null;
  occurred_at: string;
  source: string;
  categories: { name: string; color: string | null } | null;
  payment_methods: { name: string; kind: string } | null;
}

interface Props {
  rows: Row[];
  page: number;
  pageSize: number;
  total: number;
}

export function TransactionsTable({ rows, page, pageSize, total }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  function goto(p: number) {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("page", String(p));
    router.push(`/transactions?${next}`);
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-bg-elev-2 text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Descrição</th>
              <th className="px-4 py-2 text-left">Categoria</th>
              <th className="px-4 py-2 text-left">Método</th>
              <th className="px-4 py-2 text-left">Fonte</th>
              <th className="px-4 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-bg-elev-2">
                <td className="px-4 py-2 text-text-muted">{fmtDate(r.occurred_at)}</td>
                <td className="px-4 py-2">
                  <Link href={`/transactions/${r.id}`} className="hover:underline">
                    {r.description ?? r.categories?.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {r.categories ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.categories.color ?? "#9CA3AF" }} />
                      {r.categories.name}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-text-muted">{r.payment_methods?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <Badge variant={r.source === "whatsapp" ? "accent" : "secondary"}>{r.source}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <Money value={Number(r.amount)} tone={r.type === "income" ? "success" : "default"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-text-muted">
        <span>Página {page} de {lastPage}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => goto(page - 1)}>Anterior</Button>
          <Button size="sm" variant="ghost" disabled={page >= lastPage} onClick={() => goto(page + 1)}>Próxima</Button>
        </div>
      </div>
    </Card>
  );
}
