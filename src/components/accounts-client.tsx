"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wallet, CreditCard, PiggyBank, Landmark, Coins, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";

type Acc = {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  color: string | null;
  opening_balance: number;
  credit_limit: number | null;
  balance: number;
};

const TYPES: Record<string, { label: string; icon: any }> = {
  checking: { label: "Conta corrente", icon: Landmark },
  savings: { label: "Poupança", icon: PiggyBank },
  wallet: { label: "Carteira", icon: Wallet },
  credit_card: { label: "Cartão de crédito", icon: CreditCard },
  investment: { label: "Investimento", icon: TrendingUp },
  cash: { label: "Dinheiro", icon: Coins },
};

export function AccountsClient({ householdId, accounts }: { householdId: string; accounts: Acc[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "checking",
    institution: "",
    opening_balance: "",
    credit_limit: "",
    color: "#16a34a",
  });

  const total = accounts.filter((a) => a.type !== "credit_card").reduce((s, a) => s + Number(a.balance), 0);

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("accounts").insert({
      household_id: householdId,
      name: form.name,
      type: form.type,
      institution: form.institution || null,
      opening_balance: parseFloat(form.opening_balance.replace(",", ".")) || 0,
      credit_limit: form.type === "credit_card" ? parseFloat(form.credit_limit.replace(",", ".")) || null : null,
      color: form.color,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", type: "checking", institution: "", opening_balance: "", credit_limit: "", color: "#16a34a" });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Arquivar esta conta?")) return;
    await supabase.from("accounts").update({ archived: true }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-fg-soft">Patrimônio líquido</p>
          <p className="num text-2xl font-semibold">{brl(total)}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">Cadastre suas contas, carteira e cartões.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((a) => {
            const T = TYPES[a.type] ?? TYPES.checking;
            const Icon = T.icon;
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: a.color || "#16a34a" }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted">{T.label}{a.institution ? ` · ${a.institution}` : ""}</p>
                    </div>
                  </div>
                  <button onClick={() => remove(a.id)} className="text-fg-soft hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className={`num mt-4 text-xl font-semibold ${Number(a.balance) < 0 ? "text-danger" : ""}`}>{brl(Number(a.balance))}</p>
                {a.type === "credit_card" && a.credit_limit ? (
                  <p className="text-xs text-muted">Limite {brl(Number(a.credit_limit))}</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova conta">
        <div className="space-y-3">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nubank, Carteira..." />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tipo">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Instituição">
              <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="Banco" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Saldo inicial (R$)">
              <Input inputMode="decimal" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} placeholder="0,00" />
            </Field>
            {form.type === "credit_card" && (
              <Field label="Limite (R$)">
                <Input inputMode="decimal" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} placeholder="0,00" />
              </Field>
            )}
            <Field label="Cor">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-surface-2" />
            </Field>
          </div>
          <Button onClick={add} loading={saving} className="w-full">Criar conta</Button>
        </div>
      </Modal>
    </div>
  );
}
