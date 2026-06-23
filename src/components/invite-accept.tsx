"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";

export function InviteAccept({ token }: { token: string }) {
  const [stage, setStage] = useState<"loading" | "auth" | "ready" | "joining" | "done" | "error">("loading");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setStage(data.user ? "ready" : "auth"));
  }, []);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao autenticar.");
      return;
    }
    setStage("ready");
  }

  async function join() {
    setStage("joining");
    const supabase = createClient();
    const { error } = await supabase.rpc("accept_invite", { invite_token: token });
    if (error) {
      setError(error.message);
      setStage("error");
      return;
    }
    setStage("done");
    window.location.assign("/dashboard");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-soft">
        <div className="mb-5 flex justify-center">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-semibold">Convite para a família</h1>
        <p className="mt-1 text-sm text-fg-soft">Junte-se para compartilhar as finanças.</p>

        {stage === "loading" && <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-muted" />}

        {stage === "auth" && (
          <form onSubmit={authenticate} className="mt-6 space-y-3 text-left">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="senha"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40" />
            {error && <p className="text-xs text-danger">{error}</p>}
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white">
              {mode === "signup" ? "Criar conta e continuar" : "Entrar e continuar"}
            </button>
            <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="w-full text-center text-xs text-fg-soft hover:text-fg">
              {mode === "signup" ? "Já tenho conta" : "Criar conta"}
            </button>
          </form>
        )}

        {stage === "ready" && (
          <button onClick={join} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white">
            <ArrowRight className="h-4 w-4" /> Entrar na família
          </button>
        )}

        {stage === "joining" && <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-muted" />}

        {stage === "done" && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-success">
            <Check className="h-4 w-4" /> Pronto! Redirecionando...
          </p>
        )}

        {stage === "error" && <p className="mt-6 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
