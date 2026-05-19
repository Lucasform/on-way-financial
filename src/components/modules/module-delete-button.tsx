"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteModuleAction, getModuleDeletionImpact } from "@/app/(app)/modules/actions";
import { Button } from "@/components/ui/button";

const CHILD_LABELS: Record<string, string> = {
  obra_phases: "fases",
  obra_workers: "membros da equipe",
  obra_gallery: "fotos/vídeos",
  travel_items: "itens da viagem",
  car_options: "opções de carro",
  gift_items: "presentes",
  education_items: "itens de educação",
  custom_items: "itens personalizados",
};

export function ModuleDeleteButton({ moduleId, moduleName }: { moduleId: string; moduleName: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<{
    transactionsLinked: number;
    totalSpent: number;
    childCounts: Record<string, number>;
  } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  async function openDialog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    setLoadingImpact(true);
    try {
      const result = await getModuleDeletionImpact(moduleId);
      setImpact(result);
    } finally {
      setLoadingImpact(false);
    }
  }

  function confirmDelete() {
    start(async () => {
      const result = await deleteModuleAction(moduleId);
      if (!result.ok) {
        toast.error(result.error ?? "Falha ao excluir.");
        return;
      }
      toast.success(
        result.unlinkedTransactions && result.unlinkedTransactions > 0
          ? `"${moduleName}" excluído. ${result.unlinkedTransactions} transação(ões) foram preservadas.`
          : `"${moduleName}" excluído.`,
      );
      setOpen(false);
    });
  }

  function cancel(e?: React.MouseEvent) {
    e?.stopPropagation();
    setOpen(false);
    setImpact(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={pending}
        aria-label={`Excluir módulo ${moduleName}`}
        title="Excluir módulo"
        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-md text-text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={cancel}
        >
          <div
            className="surface w-full max-w-md space-y-4 rounded-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold">Excluir &quot;{moduleName}&quot;?</h3>
              <p className="mt-1 text-sm text-text-muted">
                Essa ação não pode ser desfeita.
              </p>
            </div>

            {loadingImpact ? (
              <p className="text-sm text-text-muted">Calculando o que será afetado…</p>
            ) : impact ? (
              <div className="space-y-2 rounded-md border border-border bg-bg-elev-2 p-3 text-sm">
                {impact.transactionsLinked > 0 ? (
                  <p className="text-success">
                    ✓ {impact.transactionsLinked} transação{impact.transactionsLinked === 1 ? "" : "ões"}{" "}
                    (R$ {impact.totalSpent.toFixed(2).replace(".", ",")}) será{impact.transactionsLinked === 1 ? "" : "ão"}{" "}
                    <strong>mantida{impact.transactionsLinked === 1 ? "" : "s"}</strong>, mas sem vínculo com esse módulo.
                  </p>
                ) : (
                  <p className="text-text-muted">Nenhuma transação vinculada.</p>
                )}
                {Object.keys(impact.childCounts).length > 0 && (
                  <div>
                    <p className="text-danger">
                      ✕ Será apagado <strong>permanentemente</strong>:
                    </p>
                    <ul className="ml-4 mt-1 list-disc text-xs text-text-muted">
                      {Object.entries(impact.childCounts).map(([tbl, count]) => (
                        <li key={tbl}>
                          {count} {CHILD_LABELS[tbl] ?? tbl}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={cancel} disabled={pending}>
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={pending || loadingImpact}
                className="bg-danger text-white hover:bg-danger/90"
              >
                {pending ? "Excluindo…" : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
