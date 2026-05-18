"use client";

import { useState, useTransition } from "react";
import { Archive, CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface PM {
  id: string;
  name: string;
  kind: string;
  last_four: string | null;
  brand: string | null;
  credit_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  is_default: boolean;
}

const KIND_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  bank_transfer: "Transferência",
  boleto: "Boleto",
  meal_voucher: "Vale-refeição",
  other: "Outro",
};

interface Props {
  initial: PM[];
  invoices: Record<string, number>;
  householdId: string;
  canWrite: boolean;
}

export function PaymentMethodManager({ initial, invoices, householdId, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<PM>>({ kind: "pix", name: "" });

  function save() {
    if (!canWrite || !draft.name?.trim() || !draft.kind) return;
    start(async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .insert({
          household_id: householdId,
          name: draft.name!.trim(),
          kind: draft.kind!,
          last_four: draft.last_four ?? null,
          brand: draft.brand ?? null,
          credit_limit: draft.credit_limit ?? null,
          closing_day: draft.closing_day ?? null,
          due_day: draft.due_day ?? null,
          is_default: false,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao salvar.");
        return;
      }
      setItems((s) => [...s, data as PM]);
      setDraft({ kind: "pix", name: "" });
    });
  }

  function archive(id: string) {
    if (!canWrite) return;
    start(async () => {
      const { error } = await supabase
        .from("payment_methods")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        toast.error("Falha ao arquivar.");
        return;
      }
      setItems((s) => s.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="pmname">Nome</Label>
              <Input
                id="pmname"
                value={draft.name ?? ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nubank Roxinho"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pmkind">Tipo</Label>
              <select
                id="pmkind"
                value={draft.kind ?? "pix"}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {draft.kind === "credit_card" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="cl">Limite</Label>
                  <Input
                    id="cl"
                    type="number"
                    step="0.01"
                    value={draft.credit_limit ?? ""}
                    onChange={(e) => setDraft({ ...draft, credit_limit: Number(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cd">Fechamento (dia)</Label>
                  <Input
                    id="cd"
                    type="number"
                    min={1}
                    max={31}
                    value={draft.closing_day ?? ""}
                    onChange={(e) => setDraft({ ...draft, closing_day: Number(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dd">Vencimento (dia)</Label>
                  <Input
                    id="dd"
                    type="number"
                    min={1}
                    max={31}
                    value={draft.due_day ?? ""}
                    onChange={(e) => setDraft({ ...draft, due_day: Number(e.target.value) || null })}
                  />
                </div>
              </>
            )}
            <div className="sm:col-span-3 flex justify-end">
              <Button onClick={save} disabled={pending}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-text-muted" />
                  <p className="font-semibold">{m.name}</p>
                  {m.is_default && <Badge>padrão</Badge>}
                </div>
                <p className="text-xs text-text-muted">{KIND_LABELS[m.kind] ?? m.kind}</p>
                {m.kind === "credit_card" && (
                  <div className="mt-2 space-y-1 text-xs text-text-muted">
                    {m.closing_day && <p>Fecha dia {m.closing_day} · Vence dia {m.due_day}</p>}
                    {invoices[m.id] != null && (
                      <p>
                        Fatura atual: <Money value={invoices[m.id]} size="sm" />
                      </p>
                    )}
                  </div>
                )}
              </div>
              {canWrite && (
                <Button variant="ghost" size="icon" onClick={() => archive(m.id)} aria-label="Arquivar">
                  <Archive className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
