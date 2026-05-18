"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { addMonths, format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { todayISO } from "@/lib/dates";
import { splitInstallments } from "@/lib/money";

const schema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.coerce.number().positive("Informe um valor positivo."),
  description: z.string().max(200).optional(),
  occurred_at: z.string(),
  category_id: z.string().uuid().nullable().optional().or(z.literal("")),
  payment_method_id: z.string().uuid().nullable().optional().or(z.literal("")),
  module_id: z.string().uuid().nullable().optional().or(z.literal("")),
  installments_total: z.coerce.number().int().min(1).max(36).default(1),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  userId: string;
  householdId: string;
  categories: { id: string; name: string; type: string; color: string | null }[];
  methods: { id: string; name: string; kind: string; is_default: boolean }[];
  modules: { id: string; kind: string; name: string }[];
}

export function NewTransactionForm({ userId, householdId, categories, methods, modules }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [pending, start] = useTransition();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const defaultPayment = methods.find((m) => m.is_default)?.id ?? methods[0]?.id ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      amount: 0,
      description: "",
      occurred_at: todayISO(),
      category_id: "",
      payment_method_id: defaultPayment,
      module_id: "",
      installments_total: 1,
      notes: "",
    },
  });

  const type = form.watch("type");
  const installments = form.watch("installments_total");
  const filteredCategories = categories.filter((c) => (type === "income" ? c.type === "income" : c.type === "expense"));

  async function uploadReceipt(): Promise<string | null> {
    if (!receiptFile) return null;
    const path = `${householdId}/${crypto.randomUUID()}-${receiptFile.name}`;
    const { error } = await supabase.storage.from("receipts").upload(path, receiptFile, {
      cacheControl: "3600",
    });
    if (error) {
      console.error(error);
      toast.error("Não consegui enviar o comprovante.");
      return null;
    }
    return path;
  }

  function onSubmit(values: FormValues) {
    start(async () => {
      const receiptPath = await uploadReceipt();
      const moduleSelected = modules.find((m) => m.id === values.module_id);
      const inst = Math.max(1, values.installments_total ?? 1);
      const amounts = splitInstallments(values.amount, inst);
      const groupId = inst > 1 ? crypto.randomUUID() : null;
      const occurred = parseISO(values.occurred_at);

      const payload = amounts.map((amt, i) => ({
        household_id: householdId,
        type: values.type,
        amount: amt,
        description: values.description || null,
        occurred_at: format(addMonths(occurred, i), "yyyy-MM-dd"),
        category_id: values.category_id || null,
        payment_method_id: values.payment_method_id || null,
        module_kind: moduleSelected?.kind ?? null,
        module_id: moduleSelected?.id ?? null,
        installments_total: inst > 1 ? inst : null,
        installment_number: inst > 1 ? i + 1 : null,
        installments_group_id: groupId,
        receipt_url: receiptPath,
        notes: values.notes || null,
        source: "web" as const,
        created_by: userId,
      }));

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) {
        console.error(error);
        toast.error("Não consegui salvar.");
        return;
      }
      toast.success(inst > 1 ? `${inst} parcelas registradas` : "Transação registrada");
      router.push("/transactions");
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-1 rounded-md bg-bg-elev-2 p-1">
              {(["expense", "income", "transfer"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue("type", t)}
                  className={`flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
                    type === t ? "bg-bg text-text" : "text-text-muted hover:text-text"
                  }`}
                >
                  {t === "expense" ? "Despesa" : t === "income" ? "Receita" : "Transfer."}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input id="amount" type="number" step="0.01" min="0" {...form.register("amount")} />
            {form.formState.errors.amount && (
              <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="occurred_at">Data</Label>
            <Input id="occurred_at" type="date" {...form.register("occurred_at")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" placeholder="ex.: Compras do mês" {...form.register("description")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoria</Label>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="installments_total">Parcelas</Label>
            <Input
              id="installments_total"
              type="number"
              min={1}
              max={36}
              {...form.register("installments_total")}
            />
            <p className="text-xs text-text-muted">
              {installments > 1 ? `Serão criadas ${installments} transações mensais.` : "À vista."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="module_id">Vincular a módulo</Label>
            <select
              id="module_id"
              {...form.register("module_id")}
              className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="">Nenhum</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{labelKind(m.kind)}: {m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea id="notes" {...form.register("notes")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt">Comprovante</Label>
          <Input
            id="receipt"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar transação"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function labelKind(kind: string): string {
  switch (kind) {
    case "obra": return "🧱 Obra";
    case "travel": return "✈️ Viagem";
    case "car": return "🚗 Carro";
    case "gift": return "🎁 Presente";
    case "education": return "🎓 Educação";
    default: return "✨ Custom";
  }
}
