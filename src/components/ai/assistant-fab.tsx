"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Quanto gastei em alimentação esse mês?",
  "Em que posso economizar agora?",
  "Compare meus gastos com o mês passado",
  "Quais minhas 3 maiores despesas recentes?",
];

const WELCOME: Msg = {
  role: "assistant",
  content: `Oi! 👋 Sou seu copiloto financeiro.

Posso responder sobre seus gastos, sugerir economias e analisar tendências dos seus dados. Pergunta aí.`,
};

const POSITION_KEY = "onway-fab-position";
const FAB_SIZE = 56;
const MARGIN = 8;
const DRAG_THRESHOLD = 4; // pixels antes de considerar drag (e bloquear click)

function clampToViewport(p: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === "undefined") return p;
  const maxX = window.innerWidth - FAB_SIZE - MARGIN;
  const maxY = window.innerHeight - FAB_SIZE - MARGIN;
  return {
    x: Math.max(MARGIN, Math.min(p.x, maxX)),
    y: Math.max(MARGIN, Math.min(p.y, maxY)),
  };
}

export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Posição do FAB (draggable + persistida)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    fabX: number;
    fabY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  // Posição inicial: lê localStorage ou usa default (canto inferior direito acima do nav mobile)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        setPosition(clampToViewport({ x, y }));
        return;
      }
    } catch {
      // ignora
    }
    // Default: canto inferior direito, acima do bottom nav no mobile
    const isMobile = window.innerWidth < 768;
    const defaultX = window.innerWidth - FAB_SIZE - MARGIN;
    const defaultY = isMobile
      ? window.innerHeight - FAB_SIZE - 160 // acima do nav + FAB nova transação
      : window.innerHeight - FAB_SIZE - MARGIN - 8;
    setPosition({ x: defaultX, y: defaultY });
  }, []);

  // Reposiciona se a janela mudar
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onResize() {
      setPosition((p) => (p ? clampToViewport(p) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!position) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        fabX: position.x,
        fabY: position.y,
        moved: false,
        pointerId: e.pointerId,
      };
    },
    [position],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    setPosition(clampToViewport({ x: d.fabX + dx, y: d.fabY + dy }));
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignora
      }
      if (d.moved) {
        // Salva posição final no localStorage
        try {
          const final = clampToViewport({
            x: d.fabX + (e.clientX - d.startX),
            y: d.fabY + (e.clientY - d.startY),
          });
          localStorage.setItem(POSITION_KEY, JSON.stringify(final));
        } catch {
          // ignora
        }
        // Pequeno delay pra evitar que o click dispare logo após drag
        setTimeout(() => setDragging(false), 50);
      } else {
        // Foi um click puro
        setOpen(true);
      }
      dragRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages.filter((m) => m !== WELCOME || messages.length > 1), { role: "user", content: text }];
    // Keep welcome only when empty
    const realMessages = next.filter((m) => m !== WELCOME);
    setMessages([...realMessages]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: realMessages }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error === "no_household" ? "Você precisa de uma família ativa." : "Falha na IA.");
      }
      const data = (await res.json()) as { reply: string };
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
  }

  return (
    <>
      {/* Floating button — draggable */}
      {position && (
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Abrir assistente (arraste para mover)"
          title="Toque para abrir · arraste para mover"
          className={cn(
            "fixed z-30 flex h-14 w-14 items-center justify-center rounded-full touch-none select-none",
            "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl",
            dragging ? "scale-110 cursor-grabbing" : "cursor-grab transition-transform hover:scale-105 active:scale-95",
          )}
          style={{
            left: position.x,
            top: position.y,
            boxShadow: "0 12px 40px -10px rgba(0,209,160,0.6)",
          }}
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

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
                {m.content}
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo sobre suas finanças..."
              rows={1}
              className="min-h-[40px] resize-none"
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
            By On Way · respeitamos seus dados, contexto é por sessão
          </p>
        </form>
      </aside>
    </>
  );
}
