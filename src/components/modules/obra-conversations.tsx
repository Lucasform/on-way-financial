"use client";

import { History, Loader2, MessageCircle, Plus, QrCode, Search, Send, Smartphone, Store, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";

export interface ConversationListItem {
  id: string;
  phone: string;
  phoneLabel: string;
  contactName: string | null;
  supplierId: string | null;
  title: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
}

export interface ThreadMessage {
  id: string;
  direction: "in" | "out";
  content: string;
  created_at: string;
}

interface SupplierOption {
  id: string;
  name: string;
  hasPhone: boolean;
}

interface PhoneChat {
  jid: string;
  phoneKey: string;
  name: string | null;
  lastText: string | null;
  lastFromMe: boolean;
  updatedAt: string | null;
  unread: number;
}

type Status = "connected" | "connecting" | "disconnected";

const SUPPLIER_CATEGORIES = ["material", "mão-de-obra", "equipamento", "serviço", "outro"];

const when = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtWhen = (iso: string | null) => (iso ? when.format(new Date(iso)) : "");

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

async function inbox<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T | null> {
  const res = await fetch("/api/whatsapp/inbox", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    toast.error(data.error ?? "Não consegui fazer isso agora.");
    return null;
  }
  return data;
}

function useAutoRefresh(everyMs: number, enabled: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs, enabled]);
}

function ConnectionPanel({ status, canWrite }: { status: Status; canWrite: boolean }) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [qr, setQr] = useState<string | null>(null);
  const [pairing, setPairing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const call = useCallback(async (action: "connect" | "status" | "logout") => {
    const res = await fetch("/api/whatsapp/instance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: Status; qr?: string | null; pairingCode?: string | null; error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Falha ao falar com o WhatsApp.");
      return null;
    }
    return data;
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const data = await call("connect");
      if (!data) return;
      if (data.status === "connected") {
        toast.success("WhatsApp conectado.");
        router.refresh();
        return;
      }
      setQr(data.qr ?? null);
      setPairing(data.pairingCode ?? null);
      setWaiting(true);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!waiting) return;
    let ticks = 0;
    const t = setInterval(async () => {
      ticks++;
      const data = await call(ticks % 8 === 0 ? "connect" : "status");
      if (!data) return;
      if (data.status === "connected") {
        clearInterval(t);
        setWaiting(false);
        setQr(null);
        toast.success("WhatsApp conectado. Agora traga as conversas que quiser.");
        router.refresh();
      } else if (data.qr) {
        setQr(data.qr);
        setPairing(data.pairingCode ?? null);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [waiting, call, router]);

  if (status === "connected") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/5 px-3 py-2 text-xs">
        {ConfirmDialog}
        <span className="flex items-center gap-1.5 text-success">
          <span className="h-2 w-2 rounded-full bg-success" /> WhatsApp conectado
        </span>
        {canWrite && (
          <button
            type="button"
            className="text-text-muted hover:text-danger"
            onClick={async () => {
              if (!(await confirm("Desconectar o WhatsApp do app? As conversas já trazidas continuam aqui.", { danger: true }))) return;
              const data = await call("logout");
              if (data) router.refresh();
            }}
          >
            desconectar
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">Conecte o seu WhatsApp</p>
          <p className="text-xs text-text-muted">
            No celular: WhatsApp, Configurações, Aparelhos conectados, Conectar um aparelho, e aponte pro QR Code. Só entram no app as
            conversas que você escolher.
          </p>
        </div>
      </div>
      {!canWrite ? (
        <p className="text-xs text-text-muted">Só quem administra a obra conecta o WhatsApp.</p>
      ) : qr ? (
        <div className="flex flex-col items-center gap-2">
          <img src={qr} alt="QR Code do WhatsApp" className="h-56 w-56 rounded-lg bg-white p-2" />
          {pairing && <p className="text-xs text-text-muted">Ou use o código: <strong className="text-text">{pairing}</strong></p>}
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" /> Esperando você ler o QR Code...
          </p>
        </div>
      ) : (
        <Button onClick={connect} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Gerar QR Code
        </Button>
      )}
    </Card>
  );
}

function PhoneChatsPicker({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [chats, setChats] = useState<PhoneChat[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    inbox<{ chats: PhoneChat[] }>({ action: "phone_chats" }).then((d) => setChats(d?.chats ?? []));
  }, []);

  const q = norm(query);
  const visible = useMemo(
    () => (chats ?? []).filter((c) => !q || norm(c.name ?? "").includes(q) || c.phoneKey.includes(q.replace(/\D/g, "") || "§")),
    [chats, q],
  );

  async function open(c: PhoneChat) {
    setBusy(c.jid);
    const d = await inbox<{ conversation_id: string }>({ action: "open", jid: c.jid, name: c.name });
    setBusy(null);
    if (!d) return;
    toast.success("Conversa trazida pro app.");
    onClose();
    router.push(`/overview/conversas?c=${d.conversation_id}`);
    router.refresh();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-bg-elev shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Trazer conversa do celular</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-text-muted hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou número..."
            className="h-11 w-full bg-bg-elev pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {chats === null && (
            <li className="flex items-center justify-center gap-2 p-6 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando conversas do celular...
            </li>
          )}
          {chats !== null && visible.length === 0 && <li className="p-6 text-center text-sm text-text-muted">Nenhuma conversa encontrada.</li>}
          {visible.map((c) => (
            <li key={c.jid}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => open(c)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-elev-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{c.name ?? c.phoneKey.replace(/^lid:/, "contato ")}</p>
                    <span className="shrink-0 text-[10px] text-text-muted">{fmtWhen(c.updatedAt)}</span>
                  </div>
                  <p className="truncate text-xs text-text-muted">
                    {c.lastFromMe && "Você: "}
                    {c.lastText}
                  </p>
                </div>
                {busy === c.jid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2 text-[11px] text-text-muted">
          Ao trazer, as últimas mensagens vêm junto. As outras conversas continuam só no seu celular.
        </p>
      </div>
    </>
  );
}

function NewConversation({ suppliers }: { suppliers: SupplierOption[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!phone.trim() && !supplierId) return;
    setBusy(true);
    const d = await inbox<{ conversation_id: string }>({
      action: "start",
      ...(supplierId ? { supplier_id: supplierId } : {}),
      ...(phone.trim() ? { phone } : {}),
    });
    setBusy(false);
    if (!d) return;
    setPhone("");
    setSupplierId("");
    router.push(`/overview/conversas?c=${d.conversation_id}`);
    router.refresh();
  }

  return (
    <div className="space-y-1.5 border-b border-border p-3">
      <p className="text-xs font-semibold">Nova conversa</p>
      <select
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-bg-elev px-2 text-sm"
        aria-label="Fornecedor"
      >
        <option value="">Com um fornecedor...</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.hasPhone ? "" : " (sem telefone)"}
          </option>
        ))}
      </select>
      <div className="flex gap-1.5">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && start()}
          inputMode="tel"
          placeholder={supplierId ? "Outro número (opcional)" : "ou número: (15) 99999-0000"}
          className="h-9"
          aria-label="Número com DDD"
        />
        <Button size="sm" className="h-9" disabled={busy || (!phone.trim() && !supplierId)} onClick={start}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Abrir"}
        </Button>
      </div>
    </div>
  );
}

function Thread({
  conversation,
  messages,
  suppliers,
  canWrite,
  connected,
}: {
  conversation: ConversationListItem;
  messages: ThreadMessage[];
  suppliers: SupplierOption[];
  canWrite: boolean;
  connected: boolean;
}) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: conversation.contactName ?? "", category: "material" });
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  useEffect(() => {
    if (conversation.unread > 0) void inbox({ action: "read", conversation_id: conversation.id });
  }, [conversation.id, conversation.unread]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const d = await inbox({ action: "send", conversation_id: conversation.id, text: content });
    setSending(false);
    if (!d) return;
    setText("");
    router.refresh();
  }

  async function run(body: Record<string, unknown>, ok?: string) {
    setBusy(true);
    const d = await inbox<{ count?: number }>(body);
    setBusy(false);
    if (!d) return null;
    if (ok) toast.success(ok);
    router.refresh();
    return d;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {ConfirmDialog}
      <div className="space-y-2 border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{conversation.title}</p>
            <p className="text-xs text-text-muted">
              {conversation.phoneLabel}
              {conversation.supplierId && (
                <>
                  {" · "}
                  <Link href={`/overview/fornecedores/${conversation.supplierId}`} className="text-primary hover:underline">
                    ver fornecedor
                  </Link>
                </>
              )}
            </p>
          </div>
          {canWrite && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={busy || !connected}
                title="Puxar mensagens anteriores do WhatsApp"
                aria-label="Puxar mensagens anteriores"
                onClick={async () => {
                  const d = await run({ action: "history", conversation_id: conversation.id });
                  if (d) toast.success(d.count ? `${d.count} mensagens trazidas.` : "Nenhuma mensagem antiga nova.");
                }}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={busy}
                aria-label="Tirar conversa do app"
                title="Tirar do app (não apaga do celular)"
                onClick={async () => {
                  if (!(await confirm("Tirar esta conversa do app? Ela continua no seu celular.", { danger: true }))) return;
                  const d = await inbox({ action: "remove", conversation_id: conversation.id });
                  if (!d) return;
                  router.push("/overview/conversas");
                  router.refresh();
                }}
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          )}
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Store className="h-3.5 w-3.5 text-text-muted" />
            <select
              value={conversation.supplierId ?? ""}
              disabled={busy}
              onChange={(e) =>
                run({ action: "link_supplier", conversation_id: conversation.id, supplier_id: e.target.value || null }, "Fornecedor ligado.")
              }
              className="h-8 max-w-[14rem] rounded-md border border-border bg-bg-elev px-2"
              aria-label="Fornecedor desta conversa"
            >
              <option value="">Sem fornecedor ligado</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {!conversation.supplierId && !creating && (
              <button type="button" onClick={() => setCreating(true)} className="text-primary hover:underline">
                cadastrar como fornecedor
              </button>
            )}
          </div>
        )}
        {creating && (
          <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">Novo fornecedor com este contato</p>
            <Input
              autoFocus
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              placeholder="Nome do fornecedor"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newSupplier.category}
                onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value })}
                className="h-9 rounded-md border border-border bg-bg-elev px-2 text-sm"
                aria-label="Tipo do fornecedor"
              >
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-text-muted">Telefone: {conversation.phoneLabel}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={busy || !newSupplier.name.trim()}
                onClick={async () => {
                  const d = await run(
                    { action: "create_supplier", conversation_id: conversation.id, name: newSupplier.name.trim(), category: newSupplier.category },
                  );
                  if (!d) return;
                  setCreating(false);
                  toast.success((d as { created?: boolean }).created ? "Fornecedor cadastrado e ligado à conversa." : "Esse fornecedor já existia, liguei a conversa a ele.");
                }}
              >
                Salvar fornecedor
              </Button>
            </div>
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-bg-elev-2/40 p-4">
        {messages.length === 0 && <p className="py-8 text-center text-sm text-text-muted">Sem mensagens ainda. Mande a primeira abaixo.</p>}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex flex-col", m.direction === "out" ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm",
                m.direction === "out" ? "bg-primary text-primary-foreground" : "bg-bg-elev text-text shadow-sm",
              )}
            >
              {m.content}
            </div>
            <span className="mt-0.5 px-1 text-[10px] text-text-muted">{fmtWhen(m.created_at)}</span>
          </div>
        ))}
      </div>

      {canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={!connected}
            placeholder={connected ? "Mensagem pelo seu WhatsApp..." : "Conecte o WhatsApp pra responder"}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-border bg-bg-elev px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <Button type="submit" size="icon" disabled={sending || !text.trim() || !connected} aria-label="Enviar">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </div>
  );
}

export function ObraConversations({
  configured,
  status,
  conversations,
  selected,
  messages,
  suppliers,
  canWrite,
}: {
  configured: boolean;
  status: Status;
  conversations: ConversationListItem[];
  selected: ConversationListItem | null;
  messages: ThreadMessage[];
  suppliers: SupplierOption[];
  canWrite: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const connected = status === "connected";
  useAutoRefresh(5000, configured);

  const q = norm(query);
  const visible = q ? conversations.filter((c) => norm(c.title).includes(q) || c.phone.includes(q.replace(/\D/g, "") || "§")) : conversations;

  if (!configured) {
    return (
      <Card className="p-6 text-center text-sm text-text-muted">
        O servidor do WhatsApp ainda não foi configurado no app. Assim que estiver, a conexão aparece aqui.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <ConnectionPanel status={status} canWrite={canWrite} />

      <Card className="grid h-[calc(100dvh-15rem)] min-h-[28rem] overflow-hidden p-0 md:grid-cols-[20rem_1fr]">
        <div className={cn("flex min-h-0 flex-col border-r border-border", selected && "hidden md:flex")}>
          {canWrite && connected && (
            <>
              <div className="border-b border-border p-3">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setPicking(true)}>
                  <Smartphone className="h-3.5 w-3.5" /> Trazer conversa do celular
                </Button>
              </div>
              <NewConversation suppliers={suppliers} />
            </>
          )}
          {conversations.length > 6 && (
            <div className="relative border-b border-border">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar conversa..."
                className="h-9 w-full bg-bg-elev pl-8 pr-3 text-xs outline-none"
              />
            </div>
          )}
          {visible.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-text-muted">
              <MessageCircle className="h-6 w-6" />
              {conversations.length === 0
                ? connected
                  ? "Nenhuma conversa no app ainda. Traga do celular ou comece com um fornecedor."
                  : "Conecte o WhatsApp acima pra começar."
                : "Nenhuma conversa com esse nome."}
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {visible.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/overview/conversas?c=${c.id}`}
                    prefetch={false}
                    className={cn("block px-3 py-2.5 hover:bg-bg-elev-2", c.id === selected?.id && "bg-primary/10")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                        {c.supplierId && <Store className="h-3 w-3 shrink-0 text-primary" />}
                        <span className="truncate">{c.title}</span>
                      </p>
                      <span className="shrink-0 text-[10px] text-text-muted">{fmtWhen(c.lastMessageAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="flex-1 truncate text-xs text-text-muted">{c.lastMessage}</p>
                      {c.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-success px-1.5 text-[10px] font-bold text-white">{c.unread}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected ? (
          <div className="flex min-h-0 flex-col">
            <Link href="/overview/conversas" prefetch={false} className="block border-b border-border px-4 py-2 text-xs text-primary md:hidden">
              ← Voltar pras conversas
            </Link>
            <Thread
              key={selected.id}
              conversation={selected}
              messages={messages}
              suppliers={suppliers}
              canWrite={canWrite}
              connected={connected}
            />
          </div>
        ) : (
          <div className="hidden items-center justify-center p-6 text-center text-sm text-text-muted md:flex">
            Escolha uma conversa ao lado, traga uma do celular ou comece com um fornecedor.
          </div>
        )}
      </Card>

      {picking && <PhoneChatsPicker onClose={() => setPicking(false)} />}
    </div>
  );
}
