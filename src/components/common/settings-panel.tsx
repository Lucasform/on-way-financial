"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/utils";

interface Props {
  memberId: string;
  displayName: string;
  whatsappPhone: string;
  householdId: string;
  defaultWhatsapp?: string | null;
  canConfigureHousehold?: boolean;
}

export function SettingsPanel({
  memberId,
  displayName,
  whatsappPhone,
  householdId,
  defaultWhatsapp,
  canConfigureHousehold,
}: Props) {
  const supabase = createSupabaseBrowser();
  const [name, setName] = useState(displayName);
  const [phone, setPhone] = useState(whatsappPhone);
  const [defaultWa, setDefaultWa] = useState(defaultWhatsapp ?? "");
  const [pending, start] = useTransition();
  const [savingHousehold, setSavingHousehold] = useState(false);

  function saveProfile() {
    start(async () => {
      const { error } = await supabase
        .from("household_members")
        .update({ display_name: name || null, whatsapp_phone: phone ? normalizePhone(phone) : null })
        .eq("id", memberId);
      if (error) {
        toast.error("Falha ao salvar.");
        return;
      }
      toast.success("Perfil atualizado.");
    });
  }

  async function saveDefaultWhatsapp() {
    setSavingHousehold(true);
    try {
      const { error } = await supabase
        .from("households")
        .update({ default_whatsapp_phone: defaultWa ? normalizePhone(defaultWa) : null })
        .eq("id", householdId);
      if (error) {
        toast.error("Falha ao salvar.");
        return;
      }
      toast.success("WhatsApp padrão atualizado.");
    } finally {
      setSavingHousehold(false);
    }
  }

  async function exportCsv() {
    const { data } = await supabase
      .from("transactions")
      .select("occurred_at, type, amount, description, categories:categories(name), payment_methods:payment_methods(name)")
      .eq("household_id", householdId)
      .order("occurred_at", { ascending: false });
    const TYPE_LABEL: Record<string, string> = {
      expense: "Despesa",
      income: "Receita",
      transfer: "Transferência",
    };
    const rows: string[][] = [
      ["Data", "Tipo", "Valor", "Descrição", "Categoria", "Método"],
      ...(data ?? []).map((t) => {
        const amount = Number(t.amount);
        return [
          t.occurred_at ?? "",
          TYPE_LABEL[t.type as string] ?? String(t.type ?? ""),
          Number.isFinite(amount) ? amount.toFixed(2).replace(".", ",") : "",
          t.description ?? "",
          (t as { categories: { name: string } | null }).categories?.name ?? "",
          (t as { payment_methods: { name: string } | null }).payment_methods?.name ?? "",
        ];
      }),
    ];
    const escape = (v: string) => `"${String(v).replaceAll('"', '""')}"`;
    const csv = rows.map((r) => r.map(escape).join(";")).join("\r\n");
    // BOM UTF-8 garante que Excel detecte UTF-8 e renderize acentos corretamente
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Perfil</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="dn">Nome de exibição</Label>
            <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wa">WhatsApp</Label>
            <Input id="wa" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={saveProfile} disabled={pending}>Salvar</Button>
          </div>
        </div>
      </Card>

      {canConfigureHousehold && (
        <Card className="p-4">
          <h2 className="mb-1 text-base font-semibold">WhatsApp padrão da obra</h2>
          <p className="mb-3 text-xs text-text-muted">
            Número usado como padrão pra mensagens da obra (ex.: avisos pra equipe).
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={defaultWa}
              onChange={(e) => setDefaultWa(e.target.value)}
              placeholder="(11) 99999-9999"
              className="max-w-xs"
            />
            <Button onClick={saveDefaultWhatsapp} disabled={savingHousehold}>Salvar</Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Exportar dados</h2>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Exportar transações (CSV)
        </Button>
      </Card>
    </div>
  );
}
