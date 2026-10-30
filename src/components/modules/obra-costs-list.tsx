"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { QuickAddExpenseDialog, type SupplierOption } from "@/components/modules/quick-add-expense-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { useConfirm } from "@/hooks/use-confirm";
import { fmtDate } from "@/lib/dates";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface CostRow {
  id: string;
  name: string;
  supplier_id: string | null;
  supplier_label: string;
  amount: number;
  bought_at: string | null;
  quote_id: string | null;
  from_payment: boolean;
}

interface Props {
  costs: CostRow[];
  suppliers: SupplierOption[];
  canWrite: boolean;
}

export function ObraCostsList({ costs, suppliers, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const nameById = new Map(suppliers.map((s) => [s.id, s.name]));

  async function remove(c: CostRow) {
    if (!canWrite || busyId) return;
    const extra = c.from_payment
      ? " É um pagamento de cotação: ele volta pra agendado e a cotação fica em execução."
      : c.quote_id
        ? " A cotação que gerou esse custo também é apagada."
        : "";
    if (!(await confirm(`Apagar "${c.name}"?${extra}`, { danger: true }))) return;
    setBusyId(c.id);
    try {
      const res = await fetch("/api/obra/revert-purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item_id: c.id, delete_quote: true }),
      });
      if (!res.ok) {
        toast.error("Falha ao apagar.");
        return;
      }
      toast.success("Custo apagado.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function assignSupplier(c: CostRow, supplierId: string) {
    if (!canWrite || !supplierId) return;
    setBusyId(c.id);
    try {
      const { error } = await supabase
        .from("obra_items")
        .update({ supplier_id: supplierId, supplier: nameById.get(supplierId) ?? null })
        .eq("id", c.id);
      if (error) {
        toast.error("Falha ao salvar o fornecedor.");
        return;
      }
      toast.success("Fornecedor definido.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-6">
      {ConfirmDialog}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Lançamentos ({costs.length})</h3>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar despesa
          </Button>
        )}
      </div>

      {costs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-text-muted">Nenhum custo nesse período.</Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {costs.map((c) => {
            const supplierName = c.supplier_id ? nameById.get(c.supplier_id) : null;
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  {supplierName ? (
                    <p className="truncate text-xs text-text-muted">
                      {supplierName}
                      {c.bought_at && <> · {fmtDate(c.bought_at, "dd/MM/yyyy")}</>}
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" /> Sem fornecedor
                      </span>
                      {canWrite && (
                        <select
                          defaultValue=""
                          disabled={busyId === c.id}
                          onChange={(e) => assignSupplier(c, e.target.value)}
                          className="h-7 rounded-md border border-border bg-bg-elev px-2 text-xs"
                          aria-label="Escolher fornecedor"
                        >
                          <option value="" disabled>
                            Escolher fornecedor
                          </option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
                <Money value={c.amount} size="sm" className="shrink-0" />
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={busyId === c.id}
                    onClick={() => remove(c)}
                    aria-label="Apagar custo"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {showAdd && (
        <QuickAddExpenseDialog
          suppliers={suppliers}
          onDone={() => {
            setShowAdd(false);
            router.refresh();
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </section>
  );
}
