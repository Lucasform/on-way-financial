"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  // common
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // magic
  const [sent, setSent] = useState(false);

  // password
  const [password, setPassword] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Link enviado! Confira seu email.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Não consegui enviar: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bem-vindo!");
      router.push(next);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha no login: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 8) {
      toast.error("Senha precisa de 8+ caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // Se o Supabase exige confirmação de email, sessão não vem direto.
      // Tentamos signIn — se exigir confirmação, devolve erro.
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) {
        toast.success("Conta criada! Confirme o email pra entrar (ou desative 'Confirm email' no Supabase).");
        return;
      }
      toast.success("Conta criada! Entrando...");
      router.push(next);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao criar conta: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="surface p-6 text-center">
        <h2 className="text-lg font-semibold">📬 Quase lá!</h2>
        <p className="mt-2 text-sm text-text-muted">
          Mandamos um link para <strong>{email}</strong>. Abra no celular ou aqui mesmo.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSent(false)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="password">Entrar</TabsTrigger>
        <TabsTrigger value="signup">Criar conta</TabsTrigger>
        <TabsTrigger value="magic">Por email</TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <form onSubmit={signInWithPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-pw">Email</Label>
            <Input
              id="email-pw"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Senha</Label>
            <Input
              id="pw"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup">
        <form onSubmit={signUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-su">Email</Label>
            <Input
              id="email-su"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-su">Senha (mín. 8 caracteres)</Label>
            <Input
              id="pw-su"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Criando..." : "Criar conta"}
          </Button>
          <p className="text-xs text-text-muted">
            Se &quot;Confirm email&quot; estiver desativado no Supabase, você entra direto.
          </p>
        </form>
      </TabsContent>

      <TabsContent value="magic">
        <form onSubmit={sendMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-ml">Email</Label>
            <Input
              id="email-ml"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Receber link de entrada"}
          </Button>
          <p className="text-xs text-text-muted">
            Sem senha. Você recebe um link direto no email pra entrar.
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
