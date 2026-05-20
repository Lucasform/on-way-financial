"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/common/category-icon";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface TxRow {
  id: string;
  type: string;
  amount: number | string;
  description: string | null;
  occurred_at: string;
  source: string;
  notes: string | null;
  installment_number: number | null;
  installments_total: number | null;
  categories: { name: string; color: string | null; icon: string | null } | null;
  payment_methods: { name: string; kind: string } | null;
}

const ORIGIN_LABEL: Record<string, string> = {
  ai_chat: "IA",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
};

function detectOrigin(tx: { source: string; notes: string | null }): string | null {
  if (tx.notes) {
    const m = tx.notes.match(/^\[origem:(ai_chat|telegram|whatsapp)\]/);
    if (m) return m[1]!;
  }
  if (tx.source === "web") return null; // manual sem badge
  if (tx.source === "whatsapp") return "whatsapp"; // legado
  return tx.source;
}

export function TransactionRow({ tx }: { tx: TxRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const title = tx.description || tx.categories?.name || (isIncome ? "Receita" : "Despesa");
  const origin = detectOrigin(tx);
  const originLabel = origin ? ORIGIN_LABEL[origin] ?? origin : null;

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Excluir "${title}"? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    start(async () => {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
      if (error) {
        toast.error(`Falha ao excluir: ${error.message}`);
        setDeleting(false);
        return;
      }
      toast.success("Transação excluída.");
      router.refresh();
    });
  }

  return (
    <div className="surface-hover group relative flex items-center gap-3 px-4 py-3 transition-colors sm:px-5">
      <Link
        href={`/transactions?focus=${tx.id}`}
        className="absolute inset-0"
        aria-label={`Detalhes de ${title}`}
      />
      <CategoryIcon
        icon={tx.categories?.icon}
        color={tx.categories?.color}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{title}</p>
        <p className="truncate text-xs text-text-muted">
          {[tx.categories?.name, tx.payment_methods?.name]
            .filter(Boolean)
            .join(" · ")}
          {tx.installments_total && tx.installments_total > 1 ? (
            <span className="ml-1">· {tx.installment_number}/{tx.installments_total}</span>
          ) : null}
        </p>
      </div>
      <div className="relative z-10 flex flex-col items-end gap-0.5">
        <Money
          value={Number(tx.amount)}
          tone={isIncome ? "success" : isTransfer ? "muted" : "default"}
          size="sm"
          className="num font-medium"
        />
        {originLabel && (
          <Badge variant="accent" className="px-1.5 py-0 text-[10px] uppercase">
            {originLabel}
          </Badge>
        )}
      </div>
      <div className="relative z-10 flex items-center gap-0.5">
        <Link
          href={`/transactions/${tx.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          aria-label="Editar transação"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted opacity-0 transition-all hover:bg-primary/10 hover:text-primary focus:opacity-100 group-hover:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending || deleting}
          aria-label="Excluir transação"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
