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
}

export function SettingsPanel({ memberId, displayName, whatsappPhone, householdId }: Props) {
  const supabase = createSupabaseBrowser();
  const [name, setName] = useState(displayName);
  const [phone, setPhone] = useState(whatsappPhone);
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

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

  function applyTheme(next: "dark" | "light") {
    setTheme(next);
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }

  async function exportCsv() {
    const { data } = await supabase
      .from("transactions")
      .select("occurred_at, type, amount, description, categories:categories(name), payment_methods:payment_methods(name)")
      .eq("household_id", householdId)
      .order("occurred_at", { ascending: false });
    const rows = [
      ["data", "tipo", "valor", "descrição", "categoria", "método"],
      ...(data ?? []).map((t) => [
        t.occurred_at,
        t.type,
        String(t.amount),
        (t.description ?? "").replaceAll(",", ";"),
        (t as { categories: { name: string } | null }).categories?.name ?? "",
        (t as { payment_methods: { name: string } | null }).payment_methods?.name ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
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

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Aparência</h2>
        <div className="flex gap-2">
          <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => applyTheme("dark")}>
            Escuro
          </Button>
          <Button variant={theme === "light" ? "default" : "outline"} onClick={() => applyTheme("light")}>
            Claro
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Exportar dados</h2>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Exportar transações (CSV)
        </Button>
      </Card>
    </div>
  );
}
