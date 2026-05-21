"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// Renderiza marcas leves (**bold**, *italic*) caso o modelo deslize.
function renderInline(text: string): React.ReactNode {
  const cleaned = text.replace(/^#{1,6}\s+/gm, "").replace(/`([^`]+)`/g, "$1");
  const parts = cleaned.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
      return <em key={i}>{p.slice(1, -1)}</em>;
    }
    return <span key={i}>{p}</span>;
  });
}

const SUGGESTIONS = [
  "Quanto gastei em alimentação esse mês?",
  "Gastei 50 no mercado hoje",
  "Recebi 3000 de salário",
  "Em que posso economizar agora?",
];

const WELCOME: Msg = {
  role: "assistant",
  content: `Oi! 👋 Sou seu copiloto financeiro.

Posso registrar despesas/receitas (ex: "gastei 50 no mercado") e responder perguntas sobre seus gastos.`,
};

export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<unknown>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    const realMessages = messages.filter((m) => m !== WELCOME);
    const next: Msg[] = [...realMessages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, pending }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error === "no_household" ? "Você precisa de uma família ativa." : "Falha na IA.");
      }
      const data = (await res.json()) as { reply: string; pending?: unknown };
      setPending(data.pending ?? null);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function reset() {
    setMessages([WELCOME]);
    setInput("");
    setPending(null);
  }

  return (
    <>
      {/* Botão fixo: mobile acima do FAB de + (bottom-20); desktop canto inferior direito */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente"
        className={cn(
          "fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full",
          "bottom-40 md:bottom-4",
          "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl",
          "transition-transform hover:scale-105 active:scale-95",
        )}
        style={{ boxShadow: "0 12px 40px -10px rgba(0,209,160,0.6)" }}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-bg-elev shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">ON AI</p>
            <p className="text-[10px] text-text-muted">seu copiloto financeiro</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={reset}>
            Limpar
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                  m.role === "user"
                    ? "rounded-tr-sm bg-primary/15 text-text"
                    : "rounded-tl-sm bg-bg-elev-2 text-text",
                )}
              >
                {m.role === "assistant" ? renderInline(m.content) : m.content}
              </div>
            </div>
          ))}

          {messages.length === 1 && messages[0] === WELCOME && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-bg-elev px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:bg-bg-elev-2 hover:text-text"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-bg-elev-2 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ex: "gastei 50 no mercado" ou pergunte algo...'
              rows={1}
              className="max-h-40 min-h-[40px] resize-none overflow-y-auto leading-snug"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-text-muted">
            By ON FIN · respeitamos seus dados, contexto é por sessão
          </p>
        </form>
      </aside>
    </>
  );
}
