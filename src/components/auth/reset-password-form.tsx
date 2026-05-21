"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Senha precisa de 8+ caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada! Entrando...");
      router.push("/overview");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao atualizar: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  if (authed === false) {
    return (
      <div className="surface p-6 text-center">
        <h2 className="text-lg font-semibold">Link inválido ou expirado</h2>
        <p className="mt-2 text-sm text-text-muted">
          Volte ao login e peça outro link de redefinição.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.push("/login")}>
          Voltar ao login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-pw">Nova senha</Label>
        <Input
          id="new-pw"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-pw">Confirmar senha</Label>
        <Input
          id="confirm-pw"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading || authed === null} className="w-full">
        {loading ? "Salvando..." : "Definir nova senha"}
      </Button>
    </form>
  );
}
