"use client";

import { useState, useTransition } from "react";
import { Download, Send, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  telegramChatId: number | null;
  telegramUsername: string | null;
  householdId: string;
}

export function SettingsPanel({
  memberId,
  displayName,
  whatsappPhone,
  telegramChatId: initialChatId,
  telegramUsername: initialUsername,
  householdId,
}: Props) {
  const supabase = createSupabaseBrowser();
  const [name, setName] = useState(displayName);
  const [phone, setPhone] = useState(whatsappPhone);
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tgChatId, setTgChatId] = useState<number | null>(initialChatId);
  const [tgUsername, setTgUsername] = useState<string | null>(initialUsername);
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [tgLinking, setTgLinking] = useState(false);

  async function connectTelegram() {
    setTgLinking(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      if (!res.ok) {
        toast.error("Falha ao gerar link do Telegram.");
        return;
      }
      const { deep_link } = (await res.json()) as { deep_link: string };
      setTgLink(deep_link);
      window.open(deep_link, "_blank", "noopener");
      toast.success("Abra o Telegram e clique em START.");
    } finally {
      setTgLinking(false);
    }
  }

  async function disconnectTelegram() {
    if (!confirm("Desvincular sua conta do Telegram?")) return;
    start(async () => {
      const { error } = await supabase
        .from("household_members")
        .update({ telegram_chat_id: null, telegram_username: null })
        .eq("id", memberId);
      if (error) {
        toast.error("Falha ao desvincular.");
        return;
      }
      setTgChatId(null);
      setTgUsername(null);
      toast.success("Desvinculado.");
    });
  }

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

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Aparência</h2>
        <p className="text-sm text-text-muted">
          Use o ícone de sol/lua no canto superior direito pra alternar entre tema claro e escuro.
          Sua preferência fica salva no navegador.
        </p>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Telegram</h2>
          {tgChatId ? <Badge variant="success">vinculado</Badge> : <Badge variant="secondary">desvinculado</Badge>}
        </div>
        {tgChatId ? (
          <div className="space-y-3 text-sm">
            <p className="text-text-muted">
              Conectado como{" "}
              <strong className="text-text">
                {tgUsername ? `@${tgUsername}` : `chat ${tgChatId}`}
              </strong>
              . Envie mensagens para o bot direto pelo Telegram.
            </p>
            <Button variant="outline" onClick={disconnectTelegram} disabled={pending}>
              <Unlink className="h-4 w-4" /> Desvincular
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-text-muted">
              Conecte sua conta do Telegram para registrar despesas direto pelo bot.
            </p>
            <Button onClick={connectTelegram} disabled={tgLinking}>
              <Send className="h-4 w-4" /> {tgLinking ? "Gerando link..." : "Conectar Telegram"}
            </Button>
            {tgLink && (
              <p className="text-xs text-text-muted">
                Se não abriu automaticamente:{" "}
                <a href={tgLink} target="_blank" rel="noreferrer" className="text-primary underline">
                  abrir no Telegram
                </a>{" "}
                (link expira em 15 min)
              </p>
            )}
          </div>
        )}
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
