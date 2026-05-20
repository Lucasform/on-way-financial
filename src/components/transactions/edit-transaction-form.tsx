"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const schema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.coerce.number().positive("Informe um valor positivo."),
  description: z.string().max(200).optional(),
  occurred_at: z.string(),
  category_id: z.string().uuid().nullable().optional().or(z.literal("")),
  payment_method_id: z.string().uuid().nullable().optional().or(z.literal("")),
  module_id: z.string().uuid().nullable().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  supplier: z.string().max(120).optional(),
});

type FormValues = z.infer<typeof schema>;

const KIND_EMOJI: Record<string, string> = {
  obra: "🧱",
  travel: "✈️",
  car: "🚗",
  gift: "🎁",
  education: "🎓",
  custom: "✨",
};

function parseSupplierFromNotes(notes: string | null): { origin: string | null; supplier: string; rest: string } {
  if (!notes) return { origin: null, supplier: "", rest: "" };
  let working = notes;
  let origin: string | null = null;
  const om = working.match(/^\[origem:([a-z_]+)\]\s*\n?/i);
  if (om) {
    origin = om[1]!;
    working = working.slice(om[0].length);
  }
  const lines = working.split("\n");
  const first = lines[0]?.trim() ?? "";
  const m = first.match(/^Fornecedor:\s*(.+)$/i);
  if (m) return { origin, supplier: m[1]!.trim(), rest: lines.slice(1).join("\n").trim() };
  return { origin, supplier: "", rest: working };
}

function buildNotes(origin: string | null, supplier: string, rest: string): string | null {
  const parts = [
    origin ? `[origem:${origin}]` : null,
    supplier.trim() ? `Fornecedor: ${supplier.trim()}` : null,
    rest.trim() || null,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

export interface EditTx {
  id: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  description: string | null;
  occurred_at: string;
  category_id: string | null;
  payment_method_id: string | null;
  module_id: string | null;
  notes: string | null;
  installment_number: number | null;
  installments_total: number | null;
  receipt_url: string | null;
}

interface Props {
  tx: EditTx;
  categories: { id: string; name: string; type: string; color: string | null }[];
  methods: { id: string; name: string; kind: string; is_default: boolean }[];
  modules: { id: string; kind: string; name: string }[];
}

export function EditTransactionForm({ tx, categories, methods, modules }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [pending, start] = useTransition();
  const initialParsed = parseSupplierFromNotes(tx.notes);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: tx.type,
      amount: tx.amount,
      description: tx.description ?? "",
      occurred_at: tx.occurred_at,
      category_id: tx.category_id ?? "",
      payment_method_id: tx.payment_method_id ?? "",
      module_id: tx.module_id ?? "",
      notes: initialParsed.rest,
      supplier: initialParsed.supplier,
    },
  });

  const type = form.watch("type");
  const selectedModuleId = form.watch("module_id");
  const selectedModule = modules.find((m) => m.id === selectedModuleId);
  const filteredCategories = categories.filter((c) =>
    type === "income" ? c.type === "income" : c.type === "expense",
  );

  function onSubmit(values: FormValues) {
    const moduleSelected = modules.find((m) => m.id === values.module_id);
    const supplierClean = moduleSelected && values.supplier?.trim() ? values.supplier.trim() : "";
    const restNotes = values.notes ?? "";
    const notesCombined = buildNotes(initialParsed.origin, supplierClean, restNotes);

    start(async () => {
      const { error } = await supabase
        .from("transactions")
        .update({
          type: values.type,
          amount: values.amount,
          description: values.description || null,
          occurred_at: values.occurred_at,
          category_id: values.category_id || null,
          payment_method_id: values.payment_method_id || null,
          module_kind: (moduleSelected?.kind as "obra" | "travel" | "car" | "gift" | "education" | "custom" | undefined) ?? null,
          module_id: moduleSelected?.id ?? null,
          notes: notesCombined,
        })
        .eq("id", tx.id);

      if (error) {
        toast.error(`Falha: ${error.message}`);
        return;
      }
      toast.success("Transação atualizada.");
      router.push("/transactions");
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {tx.installments_total && tx.installments_total > 1 && (
          <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-text-muted">
            💡 Esta é a parcela <strong>{tx.installment_number}/{tx.installments_total}</strong>. A edição
            afeta <strong>somente esta parcela</strong>; as demais ficam intactas.
          </div>
        )}

        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="grid grid-cols-3 gap-1 rounded-md bg-bg-elev-2 p-1">
            {(["expense", "income", "transfer"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => form.setValue("type", t)}
                className={`rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                  type === t ? "bg-bg text-text shadow-sm" : "text-text-muted hover:text-text"
                }`}
              >
                {t === "expense" ? "💸 Despesa" : t === "income" ? "💰 Receita" : "🔄 Transferência"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="num h-14 text-2xl font-semibold"
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurred_at">Data</Label>
            <Input id="occurred_at" type="date" className="h-14" {...form.register("occurred_at")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" {...form.register("description")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category_id">Categoria</Label>
              <Link href="/categories" className="text-[10px] text-primary hover:underline">+ nova</Link>
            </div>
            <select
              id="category_id"
              {...form.register("category_id")}
              className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method_id">Método de pagamento</Label>
            <select
              id="payment_method_id"
              {...form.register("payment_method_id")}
              className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="">—</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="module_id">Vincular a módulo</Label>
          {modules.length === 0 ? (
            <div className="surface flex items-center justify-between gap-2 p-2 text-xs text-text-muted">
              <span>Nenhum módulo ativo</span>
              <Link href="/modules" className="text-primary hover:underline">criar →</Link>
            </div>
          ) : (
            <select
              id="module_id"
              {...form.register("module_id")}
              className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="">Nenhum</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {KIND_EMOJI[m.kind] ?? "✨"} {m.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedModule && (
          <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
            <Label htmlFor="supplier" className="flex items-center gap-2">
              <span>{KIND_EMOJI[selectedModule.kind] ?? "✨"}</span>
              Fornecedor
              <span className="text-[10px] font-normal text-text-muted">({selectedModule.name})</span>
            </Label>
            <Input
              id="supplier"
              placeholder={
                selectedModule.kind === "obra"
                  ? 'Ex: "Leroy Merlin", "Eng. UBO"'
                  : selectedModule.kind === "travel"
                    ? 'Ex: "Booking", "Latam"'
                    : "Nome do fornecedor"
              }
              {...form.register("supplier")}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea id="notes" placeholder="Detalhes extras…" {...form.register("notes")} />
        </div>

        {tx.receipt_url && (
          <div className="rounded-md border border-border bg-bg-elev-2 p-3 text-xs text-text-muted">
            📎 Esta transação tem um recibo anexado.{" "}
            <a href={tx.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              ver recibo
            </a>
          </div>
        )}

        <div className="flex flex-col-reverse justify-end gap-2 pt-4 sm:flex-row">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
