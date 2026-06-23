"use client";

import { useState } from "react";
import { Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(traduz(data.error));
        setLoading(false);
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("Falha de conexão. Tente de novo.");
      setLoading(false);
    }
  }

  async function magicLink() {
    if (!email) {
      setError("Digite seu email primeiro.");
      return;
    }
    setMagicLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setMagicLoading(false);
    if (error) setError(traduz(error.message));
    else setMagicSent(true);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel da marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(120% 120% at 0% 0%, white 0%, transparent 45%)" }}
        />
        <div className="relative flex items-center gap-3">
          <LogoMark size={44} className="bg-white/15 shadow-none" />
          <span className="text-lg font-bold tracking-wide">ON · Financial</span>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Suas finanças e sua obra,
            <br />
            sempre subindo.
          </h1>
          <p className="max-w-sm text-white/80">
            Lance despesas por IA ou WhatsApp, acompanhe orçamentos, metas e o andamento da
            construção. Tudo num só lugar.
          </p>
        </div>
        <p className="relative text-sm text-white/60">On Way · {new Date().getFullYear()}</p>
      </div>

      {/* Formulário */}
      <div className="relative flex items-center justify-center p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Logo size={48} />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Bem-vindo de volta" : "Criar sua conta"}
          </h2>
          <p className="mt-1 text-sm text-fg-soft">
            {mode === "signin" ? "Entre para continuar." : "Comece a organizar suas finanças."}
          </p>

          {magicSent ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-medium">Link enviado para {email}</p>
              <p className="text-xs text-fg-soft">Abra seu email e clique para entrar.</p>
              <button onClick={() => setMagicSent(false)} className="text-xs text-brand hover:underline">
                Voltar
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="mt-8 space-y-3">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="senha"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                />
                {error && <p className="text-xs text-danger">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {mode === "signin" ? "Entrar" : "Criar conta"}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={magicLink}
                disabled={magicLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-60"
              >
                {magicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Receber link por email
              </button>

              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                }}
                className="mt-6 w-full text-center text-sm text-fg-soft hover:text-fg"
              >
                {mode === "signin" ? (
                  <>Não tem conta? <span className="font-medium text-brand">Criar</span></>
                ) : (
                  <>Já tem conta? <span className="font-medium text-brand">Entrar</span></>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function traduz(msg?: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Email ou senha incorretos.";
  if (m.includes("already registered")) return "Email já cadastrado. Faça login.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar.";
  if (m.includes("password")) return "Senha precisa ter ao menos 6 caracteres.";
  return msg || "Não foi possível autenticar.";
}
