"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createSupabaseBrowser();

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
      console.error(err);
      toast.error("Não consegui enviar o link. Verifique o email.");
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-bg-elev p-6 text-center">
        <h2 className="text-lg font-semibold">📬 Quase lá!</h2>
        <p className="mt-2 text-sm text-text-muted">
          Mandamos um link para <strong>{email}</strong>. Abra no celular ou aqui mesmo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendMagicLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando..." : "Receber link mágico"}
      </Button>
      <div className="relative my-4 text-center text-xs text-text-muted">
        <span className="bg-bg px-2">ou</span>
        <span className="absolute left-0 top-1/2 -z-10 h-px w-full bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={signInGoogle} disabled={loading}>
        Continuar com Google
      </Button>
    </form>
  );
}
