"use client";

import { Check, Link2, Loader2, MessageCircle, Plus, Search, Share2, Store, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import type { SharedDirectory } from "@/lib/shared-suppliers";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn, waLink } from "@/lib/utils";

interface MineRow {
  id: string;
  name: string;
  category: string | null;
  shared: boolean;
}

const ERRORS: Record<string, string> = {
  own_email: "Esse é o seu próprio e-mail. Use o e-mail de quem cuida da outra obra.",
  wrong_account: "Esse pedido foi enviado pra outro e-mail.",
  same_household: "Não dá pra conectar a obra com ela mesma.",
  not_found: "Não encontrei. Atualize a página.",
  forbidden: "Só quem administra a obra pode fazer isso.",
};

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/obra/shared-suppliers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; already?: boolean; email_sent?: boolean; created?: boolean };
  if (!res.ok) {
    toast.error((data.error && ERRORS[data.error]) || "Não consegui salvar. Tente de novo.");
    return null;
  }
  return data;
}

export function SharedSuppliersView({ directory, mine: initialMine, canWrite }: { directory: SharedDirectory; mine: MineRow[]; canWrite: boolean }) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const { confirm, ConfirmDialog } = useConfirm();
  const [mine, setMine] = useState(initialMine);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mineQuery, setMineQuery] = useState("");

  const q = norm(query);
  const entries = useMemo(() => (q ? directory.entries.filter((e) => norm(e.name).includes(q)) : directory.entries), [directory.entries, q]);
  const mq = norm(mineQuery);
  const mineFiltered = useMemo(() => (mq ? mine.filter((m) => norm(m.name).includes(mq)) : mine), [mine, mq]);
  const connected = directory.partners.length > 0;

  async function run(key: string, body: Record<string, unknown>, success: string) {
    setBusy(key);
    try {
      const r = await call(body);
      if (!r) return false;
      toast.success(success);
      router.refresh();
      return true;
    } finally {
      setBusy(null);
    }
  }

  async function request() {
    const ok = await run("request", { action: "request", email: email.trim() }, "Pedido enviado. Quando a outra obra aceitar, os compartilhados aparecem aqui.");
    if (ok) setEmail("");
  }

  async function toggleShare(m: MineRow) {
    setBusy(m.id);
    const next = !m.shared;
    setMine((s) => s.map((x) => (x.id === m.id ? { ...x, shared: next } : x)));
    const { error } = await supabase.from("suppliers").update({ shared: next }).eq("id", m.id);
    setBusy(null);
    if (error) {
      setMine((s) => s.map((x) => (x.id === m.id ? { ...x, shared: !next } : x)));
      toast.error("Não consegui salvar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {ConfirmDialog}

      {directory.incoming.map((p) => (
        <Card key={p.id} className="flex flex-wrap items-center gap-3 border-primary/60 p-4">
          <Link2 className="h-5 w-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm">
            A obra <strong>{p.requester_household_name}</strong> quer compartilhar fornecedores com a sua.
          </p>
          {canWrite && (
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run(p.id, { action: "decline", link_id: p.id }, "Pedido recusado.")}>
                Recusar
              </Button>
              <Button size="sm" disabled={busy !== null} onClick={() => run(p.id, { action: "accept", link_id: p.id }, "Obras conectadas.")}>
                {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Aceitar
              </Button>
            </div>
          )}
        </Card>
      ))}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Obras conectadas</h3>
        <Card className="divide-y divide-border">
          {directory.partners.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-medium">{p.household_name}</span>
              </span>
              {canWrite && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    if (await confirm(`Desconectar de "${p.household_name}"? Os fornecedores que cada obra já copiou continuam, só param de aparecer aqui.`, { danger: true })) {
                      run(p.id, { action: "disconnect", link_id: p.id }, "Obras desconectadas.");
                    }
                  }}
                  className="shrink-0 text-xs text-text-muted hover:text-danger"
                >
                  desconectar
                </button>
              )}
            </div>
          ))}
          {directory.outgoing.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate text-text-muted">Aguardando {o.invite_email} aceitar</span>
              {canWrite && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run(o.id, { action: "decline", link_id: o.id }, "Pedido cancelado.")}
                  className="shrink-0 text-xs text-text-muted hover:text-danger"
                >
                  cancelar
                </button>
              )}
            </div>
          ))}
          {canWrite && (
            <div className="space-y-2 px-4 py-3">
              <p className="text-xs text-text-muted">
                {connected ? "Conectar com mais uma obra:" : "Conecte com outra obra pra trocar fornecedores."} Digite o e-mail de quem cuida dela no app.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && email.includes("@") && request()}
                  placeholder="email@exemplo.com"
                  aria-label="E-mail de quem cuida da outra obra"
                />
                <Button disabled={busy !== null || !email.includes("@")} onClick={request} className="shrink-0">
                  {busy === "request" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Fornecedores compartilhados ({directory.entries.length})</h3>
        {directory.entries.length === 0 ? (
          <Empty
            icon={Share2}
            title="Nada compartilhado ainda"
            description={connected ? "Marque abaixo os seus fornecedores que quer compartilhar. Os das obras conectadas aparecem aqui também." : "Depois de conectar com outra obra, os fornecedores marcados por vocês aparecem aqui."}
          />
        ) : (
          <>
            {directory.entries.length > 6 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar fornecedor..."
                  className="h-10 w-full rounded-md border border-border bg-bg-elev pl-9 pr-3 text-sm outline-none focus:border-primary/60"
                />
              </div>
            )}
            <Card className="divide-y divide-border">
              {entries.map((e) => {
                const others = e.sharedBy.filter((s) => !s.mine).map((s) => s.household_name);
                const byMe = e.sharedBy.some((s) => s.mine);
                return (
                  <div key={e.key} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {e.category && <>{e.category} · </>}
                        compartilhado por {[byMe ? "você" : null, ...others].filter(Boolean).join(" e ")}
                      </p>
                    </div>
                    {e.phone && (
                      <a href={waLink(e.phone)} target="_blank" rel="noreferrer" className="shrink-0 text-success" aria-label={`WhatsApp de ${e.name}`}>
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    {e.localSupplierId ? (
                      <Link href={`/overview/fornecedores/${e.localSupplierId}`} className="shrink-0 text-xs text-primary hover:underline">
                        na sua obra
                      </Link>
                    ) : (
                      canWrite &&
                      e.copyFromId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 px-2 text-xs"
                          disabled={busy !== null}
                          onClick={() => run(e.key, { action: "copy", supplier_id: e.copyFromId }, `${e.name} entrou na sua obra.`)}
                        >
                          {busy === e.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Adicionar à minha obra
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
              {entries.length === 0 && <p className="px-4 py-3 text-xs text-text-muted">Nenhum fornecedor com esse nome.</p>}
            </Card>
          </>
        )}
      </section>

      {canWrite && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Seus fornecedores</h3>
          <p className="text-xs text-text-muted">
            Marque quem você quer compartilhar. As obras conectadas veem nome, tipo e telefone; custos, cotações e anotações continuam só seus.
          </p>
          {mine.length === 0 ? (
            <Empty icon={Store} title="Sem fornecedores ainda" description="Cadastre em Meus fornecedores." />
          ) : (
            <>
              {mine.length > 6 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={mineQuery}
                    onChange={(e) => setMineQuery(e.target.value)}
                    placeholder="Buscar nos seus fornecedores..."
                    className="h-10 w-full rounded-md border border-border bg-bg-elev pl-9 pr-3 text-sm outline-none focus:border-primary/60"
                  />
                </div>
              )}
              <Card className="divide-y divide-border">
                {mineFiltered.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      {m.name}
                      {m.category && <span className="text-text-muted"> · {m.category}</span>}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={m.shared}
                      aria-label={`Compartilhar ${m.name}`}
                      disabled={busy === m.id}
                      onClick={() => toggleShare(m)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        m.shared ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:bg-bg-elev-2",
                      )}
                    >
                      {m.shared ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-0" />}
                      {m.shared ? "Compartilhado" : "Compartilhar"}
                    </button>
                  </div>
                ))}
              </Card>
            </>
          )}
        </section>
      )}
    </div>
  );
}
