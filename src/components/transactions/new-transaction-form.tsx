"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { addMonths, format, parseISO } from "date-fns";
import { FileText, Image as ImageIcon, Plus, X } from "lucide-react";

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

const KIND_EMOJI: Record<string, string> = {
  obra: "🧱",
  travel: "✈️",
  car: "🚗",
  gift: "🎁",
  education: "🎓",
  custom: "✨",
};

export function NewTransactionForm({ userId, householdId, categories, methods, modules }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [pending, start] = useTransition();
  const [files, setFiles] = useState<File[]>([]);

  const defaultPayment = methods.find((m) => m.is_default)?.id ?? methods[0]?.id ?? "";
  const onlyBasicPayments =
    methods.length <= 2 && methods.every((m) => m.kind === "cash" || m.kind === "pix");

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
  const filteredCategories = categories.filter((c) =>
    type === "income" ? c.type === "income" : c.type === "expense",
  );

  function addFiles(newOnes: FileList | null) {
    if (!newOnes) return;
    const arr = Array.from(newOnes);
    // limite 5MB cada e total 5 arquivos
    const valid = arr.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} > 5MB`);
        return false;
      }
      return true;
    });
    setFiles((s) => [...s, ...valid].slice(0, 5));
  }

  function removeFile(idx: number) {
    setFiles((s) => s.filter((_, i) => i !== idx));
  }

  async function uploadFiles(): Promise<string[]> {
    const paths: string[] = [];
    for (const f of files) {
      const path = `${householdId}/${crypto.randomUUID()}-${f.name}`;
      const { error } = await supabase.storage.from("receipts").upload(path, f, { cacheControl: "3600" });
      if (error) {
        console.error(error);
        toast.error(`Falha ao enviar ${f.name}`);
        continue;
      }
      paths.push(path);
    }
    return paths;
  }

  function onSubmit(values: FormValues, opts: { addAnother?: boolean } = {}) {
    start(async () => {
      const uploaded = await uploadFiles();
      const receiptPath = uploaded[0] ?? null;
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
        module_kind: (moduleSelected?.kind as "obra" | "travel" | "car" | "gift" | "education" | "custom" | undefined) ?? null,
        module_id: moduleSelected?.id ?? null,
        installments_total: inst > 1 ? inst : null,
        installment_number: inst > 1 ? i + 1 : null,
        installments_group_id: groupId,
        receipt_url: receiptPath,
        notes:
          [
            values.notes || null,
            uploaded.length > 1 ? `Anexos extras: ${uploaded.slice(1).join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("\n") || null,
        source: "web" as const,
        created_by: userId,
      }));

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) {
        console.error(error);
        toast.error(`Falha: ${error.message}`);
        return;
      }
      toast.success(inst > 1 ? `${inst} parcelas registradas` : "Transação registrada");
      if (opts.addAnother) {
        form.reset({
          type: values.type,
          amount: 0,
          description: "",
          occurred_at: values.occurred_at,
          category_id: values.category_id ?? "",
          payment_method_id: values.payment_method_id ?? defaultPayment,
          module_id: values.module_id ?? "",
          installments_total: 1,
          notes: "",
        });
        setFiles([]);
      } else {
        router.push("/transactions");
        router.refresh();
      }
    });
  }

  return (
    <Card className="p-6">
      <form
        onSubmit={form.handleSubmit((v) => onSubmit(v))}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault();
            form.handleSubmit((v) => onSubmit(v))();
          }
        }}
        className="space-y-5"
      >
        {/* Tipo (segmented) */}
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

        {/* Valor + Data lado a lado */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              autoFocus
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
          <Input id="description" placeholder='Ex: "Compras do mês"' {...form.register("description")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category_id">Categoria</Label>
              <Link href="/categories" className="text-[10px] text-primary hover:underline">
                + nova
              </Link>
            </div>
            <select
              id="category_id"
              {...form.register("category_id")}
              className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment_method_id">Método de pagamento</Label>
              <Link href="/payment-methods" className="text-[10px] text-primary hover:underline">
                + cartão
              </Link>
            </div>
            <select
              id="payment_method_id"
              {...form.register("payment_method_id")}
              className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
            >
              <option value="">—</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {kindLabel(m.kind)} {m.name}
                </option>
              ))}
            </select>
            {onlyBasicPayments && (
              <p className="text-[10px] text-warning">
                💡 Só tem PIX e Dinheiro. Cadastre cartões e débito em <Link href="/payment-methods" className="underline">Métodos</Link>.
              </p>
            )}
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
              {installments > 1 ? `${installments} transações mensais serão criadas.` : "À vista."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="module_id">Vincular a módulo</Label>
              {modules.length === 0 && (
                <Link href="/modules" className="text-[10px] text-primary hover:underline">
                  + criar módulo
                </Link>
              )}
            </div>
            {modules.length === 0 ? (
              <div className="surface flex items-center justify-between gap-2 p-2 text-xs text-text-muted">
                <span>Nenhum módulo ativo</span>
                <Link href="/modules" className="text-primary hover:underline">
                  criar →
                </Link>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea id="notes" placeholder="Detalhes extras…" {...form.register("notes")} />
        </div>

        {/* Comprovantes múltiplos */}
        <div className="space-y-2">
          <Label htmlFor="receipt">Comprovantes (foto ou PDF, até 5)</Label>
          <div className="surface space-y-3 p-3">
            <Input
              id="receipt"
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = ""; // permite re-selecionar mesmo arquivo
              }}
            />
            {files.length > 0 && (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {files.map((f, idx) => (
                  <li key={idx} className="surface flex items-center gap-2 p-2 text-xs">
                    {f.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(f)} alt={f.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded bg-bg-elev-2">
                        {f.type === "application/pdf" ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                      </span>
                    )}
                    <span className="flex-1 truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-text-muted hover:text-danger"
                      aria-label="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 pt-4 sm:flex-row sm:items-center">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => form.handleSubmit((v) => onSubmit(v, { addAnother: true }))()}
          >
            <Plus className="h-4 w-4" /> Salvar e adicionar outra
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar transação"}
          </Button>
        </div>
        <p className="text-right text-[10px] text-text-muted">
          atalho: <kbd className="rounded bg-bg-elev-2 px-1">Ctrl</kbd>+<kbd className="rounded bg-bg-elev-2 px-1">Enter</kbd>
        </p>
      </form>
    </Card>
  );
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "pix":
      return "💸";
    case "credit_card":
      return "💳";
    case "debit_card":
      return "💳";
    case "cash":
      return "💵";
    case "bank_transfer":
      return "🏦";
    case "boleto":
      return "📃";
    case "meal_voucher":
      return "🍽️";
    default:
      return "•";
  }
}
