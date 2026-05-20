"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Hammer, Pencil, Save, Settings2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Textarea } from "@/components/ui/textarea";
import { Empty } from "@/components/ui/empty";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtRelative } from "@/lib/dates";

export interface ObraTx {
  id: string;
  amount: number | string;
  description: string | null;
  occurred_at: string;
  notes: string | null;
  receipt_url: string | null;
  installment_number: number | null;
  installments_total: number | null;
  source: string;
  categories: { name: string; color: string | null } | null;
  payment_methods: { name: string; kind: string } | null;
}

interface Props {
  transactions: ObraTx[];
  canWrite: boolean;
}

// Extrai metadados embutidos no notes: [origem:X] e Fornecedor: Y
function parseNotes(notes: string | null): { origin: string | null; supplier: string | null; rest: string | null } {
  if (!notes) return { origin: null, supplier: null, rest: null };
  let working = notes;
  let origin: string | null = null;
  const om = working.match(/^\[origem:([a-z_]+)\]\s*\n?/i);
  if (om) {
    origin = om[1]!;
    working = working.slice(om[0].length);
  }
  const lines = working.split("\n");
  const first = lines[0]?.trim() ?? "";
  const sm = first.match(/^Fornecedor:\s*(.+)$/i);
  if (sm) {
    const rest = lines.slice(1).join("\n").trim();
    return { origin, supplier: sm[1]!.trim(), rest: rest || null };
  }
  return { origin, supplier: null, rest: working.trim() || null };
}

function buildNotes(origin: string | null, supplier: string | null, rest: string | null): string | null {
  const parts = [
    origin ? `[origem:${origin}]` : null,
    supplier ? `Fornecedor: ${supplier}` : null,
    rest || null,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

export function ObraExpensesTab({ transactions, canWrite }: Props) {
  const [items, setItems] = useState(transactions);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function applyPatch(id: string, patch: Partial<ObraTx>) {
    setItems((s) => s.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  if (items.length === 0) {
    return (
      <Empty
        icon={Hammer}
        title="Sem despesas"
        description='Adicione pela área de transações ou diga "gastei X em Y" no chat da IA.'
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {items.map((t) => {
            const isOpen = expandedId === t.id;
            const { supplier } = parseNotes(t.notes);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : t.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-elev-2/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.description ?? t.categories?.name ?? "—"}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {fmtRelative(t.occurred_at)}
                        {supplier && ` · ${supplier}`}
                        {t.categories?.name && ` · ${t.categories.name}`}
                      </p>
                    </div>
                  </div>
                  <Money value={Number(t.amount)} className="shrink-0" />
                </button>
                {isOpen && (
                  <ExpenseDetails
                    tx={t}
                    canWrite={canWrite}
                    onChange={(patch) => applyPatch(t.id, patch)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExpenseDetails({
  tx,
  canWrite,
  onChange,
}: {
  tx: ObraTx;
  canWrite: boolean;
  onChange: (patch: Partial<ObraTx>) => void;
}) {
  const supabase = createSupabaseBrowser();
  const parsed = parseNotes(tx.notes);
  const [editing, setEditing] = useState(false);
  const [supplier, setSupplier] = useState(parsed.supplier ?? "");
  const [restNotes, setRestNotes] = useState(parsed.rest ?? "");
  const [pending, start] = useTransition();

  function save() {
    if (!canWrite) return;
    const newNotes = buildNotes(parsed.origin, supplier.trim() || null, restNotes.trim() || null);
    start(async () => {
      const { error } = await supabase
        .from("transactions")
        .update({ notes: newNotes })
        .eq("id", tx.id);
      if (error) {
        toast.error("Falha ao salvar.");
        return;
      }
      onChange({ notes: newNotes });
      setEditing(false);
      toast.success("Atualizado.");
    });
  }

  function cancel() {
    setSupplier(parsed.supplier ?? "");
    setRestNotes(parsed.rest ?? "");
    setEditing(false);
  }

  return (
    <div className="border-t border-border bg-bg-elev-2/30 px-4 py-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Categoria">
          {tx.categories?.name ? (
            <Badge variant="secondary">{tx.categories.name}</Badge>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </Field>
        <Field label="Método de pagamento">
          {tx.payment_methods?.name ? (
            <span>
              {tx.payment_methods.name}{" "}
              <span className="text-[10px] text-text-muted">({tx.payment_methods.kind})</span>
            </span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </Field>
        {tx.installments_total && tx.installments_total > 1 && (
          <Field label="Parcela">
            <span>
              {tx.installment_number ?? "—"} / {tx.installments_total}
            </span>
          </Field>
        )}
        <Field label="Origem">
          <Badge variant="default" className="capitalize">
            {tx.source}
          </Badge>
        </Field>
        <Field label="Fornecedor" className="sm:col-span-2">
          {editing ? (
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder='Ex: "Leroy Merlin", "Casa do Construtor"...'
            />
          ) : parsed.supplier ? (
            <span>{parsed.supplier}</span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </Field>
        <Field label="Notas" className="sm:col-span-2">
          {editing ? (
            <Textarea
              value={restNotes}
              onChange={(e) => setRestNotes(e.target.value)}
              rows={2}
              placeholder="Detalhes, nº da nota fiscal, garantia..."
            />
          ) : parsed.rest ? (
            <p className="whitespace-pre-wrap text-sm">{parsed.rest}</p>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </Field>
        {tx.receipt_url && (
          <Field label="Recibo" className="sm:col-span-2">
            <a
              href={tx.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Ver recibo <ExternalLink className="h-3 w-3" />
            </a>
          </Field>
        )}
      </div>

      {canWrite && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button size="sm" onClick={save} disabled={pending}>
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/transactions/${tx.id}/edit`}>
                  <Settings2 className="h-4 w-4" /> Editar tudo
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Editar fornecedor/notas
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
        {label}
      </Label>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
