"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { HouseholdRole } from "@/types/database";

interface Member {
  id: string;
  user_id: string;
  role: HouseholdRole;
  display_name: string | null;
  whatsapp_phone: string | null;
  created_at: string;
}

interface Invite {
  id: string;
  email: string | null;
  role: HouseholdRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface Props {
  householdId: string;
  currentRole: HouseholdRole;
  members: Member[];
  invites: Invite[];
}

const ROLE_LABELS: Record<HouseholdRole, string> = {
  owner: "Dono",
  admin: "Administrador",
  viewer: "Convidado",
};

function inviteLink(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export function FamilyManager({
  householdId,
  currentRole,
  members: initialMembers,
  invites: initialInvites,
}: Props) {
  const supabase = createSupabaseBrowser();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<HouseholdRole>("viewer");
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const canManage = currentRole === "owner" || currentRole === "admin";

  function invite() {
    if (!canManage || !email.trim()) return;
    const normalized = email.trim().toLowerCase();
    // Bloqueia duplicata pendente
    const existing = invites.find(
      (i) => !i.accepted_at && i.email?.toLowerCase() === normalized && new Date(i.expires_at) > new Date(),
    );
    if (existing) {
      toast.error("Já existe convite pendente pra esse email. Cancele ou copie o link existente.");
      return;
    }
    start(async () => {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", household_id: householdId, email: normalized, role }),
      });
      if (!res.ok) {
        toast.error("Falha ao convidar.");
        return;
      }
      const inv = (await res.json()) as Invite & { email_sent?: boolean };
      setInvites((s) => [inv, ...s]);
      setEmail("");
      // Copia o link automaticamente (fallback caso o email falhe)
      try {
        await navigator.clipboard.writeText(inviteLink(inv.token));
      } catch {
        // ignora
      }
      if (inv.email_sent) {
        toast.success(`Convite enviado por email pra ${normalized}. Link copiado também.`);
      } else {
        toast.success("Convite criado. Link copiado — mande manualmente pra pessoa.");
      }
    });
  }

  async function copyLink(inv: Invite) {
    try {
      await navigator.clipboard.writeText(inviteLink(inv.token));
      toast.success("Link copiado.");
    } catch {
      toast.error("Não consegui copiar. Tente manualmente.");
    }
  }

  function cancelInvite(id: string) {
    if (!canManage) return;
    if (!confirm("Cancelar este convite? Quem tiver o link não vai mais conseguir entrar.")) return;
    setBusyId(id);
    start(async () => {
      const { error } = await supabase.from("household_invites").delete().eq("id", id);
      if (error) {
        toast.error(`Falha ao cancelar: ${error.message}`);
        setBusyId(null);
        return;
      }
      setInvites((s) => s.filter((i) => i.id !== id));
      setBusyId(null);
      toast.success("Convite cancelado.");
    });
  }

  function regenerateInvite(old: Invite) {
    if (!canManage || !old.email) return;
    setBusyId(old.id);
    start(async () => {
      // Apaga o expirado
      await supabase.from("household_invites").delete().eq("id", old.id);
      // Cria um novo
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", household_id: householdId, email: old.email, role: old.role }),
      });
      if (!res.ok) {
        toast.error("Falha ao gerar novo convite.");
        setBusyId(null);
        return;
      }
      const inv = (await res.json()) as Invite;
      setInvites((s) => [inv, ...s.filter((i) => i.id !== old.id)]);
      setBusyId(null);
      try {
        await navigator.clipboard.writeText(inviteLink(inv.token));
        toast.success("Novo link gerado e copiado.");
      } catch {
        toast.success("Novo link gerado.");
      }
    });
  }

  function changeRole(id: string, newRole: HouseholdRole) {
    if (currentRole !== "owner") return;
    start(async () => {
      const { error } = await supabase.from("household_members").update({ role: newRole }).eq("id", id);
      if (error) {
        toast.error("Falha.");
        return;
      }
      setMembers((s) => s.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
    });
  }

  function removeMember(id: string) {
    if (currentRole !== "owner") return;
    if (!confirm("Remover este membro do grupo?")) return;
    start(async () => {
      const { error } = await supabase.from("household_members").delete().eq("id", id);
      if (error) {
        toast.error("Falha.");
        return;
      }
      setMembers((s) => s.filter((m) => m.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Membros</div>
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.display_name ?? "Sem nome"}</p>
                <p className="text-xs text-text-muted">{m.whatsapp_phone ?? "Sem WhatsApp"}</p>
              </div>
              <div className="flex items-center gap-2">
                {currentRole === "owner" ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value as HouseholdRole)}
                    className="h-8 rounded-md border border-border bg-bg-elev px-2 text-xs"
                  >
                    <option value="owner">Dono</option>
                    <option value="admin">Administrador</option>
                    <option value="viewer">Convidado</option>
                  </select>
                ) : (
                  <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                )}
                {currentRole === "owner" && (
                  <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {canManage && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="invemail">Email do convidado</Label>
              <Input
                id="invemail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invrole">Papel</Label>
              <select
                id="invrole"
                value={role}
                onChange={(e) => setRole(e.target.value as HouseholdRole)}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                <option value="viewer">Convidado (só visualiza)</option>
                <option value="admin">Administrador (lança e gerencia)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={invite} disabled={pending || !email.trim()} className="w-full">
                <Mail className="h-4 w-4" /> Convidar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Convites</div>
        {invites.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">Nenhum convite ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at) < new Date();
              const accepted = !!inv.accepted_at;
              const status = accepted ? "aceito" : expired ? "expirado" : "pendente";
              const variant = accepted ? "success" : expired ? "danger" : "warning";
              const isBusy = busyId === inv.id;
              return (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{inv.email ?? "—"}</p>
                    <p className="text-xs text-text-muted">{ROLE_LABELS[inv.role]}</p>
                  </div>
                  <Badge variant={variant}>{status}</Badge>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      {!accepted && !expired && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(inv)}
                          aria-label="Copiar link"
                          title="Copiar link"
                          disabled={isBusy}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {!accepted && expired && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => regenerateInvite(inv)}
                          aria-label="Gerar novo link"
                          title="Gerar novo link"
                          disabled={isBusy}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {!accepted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelInvite(inv.id)}
                          aria-label="Cancelar convite"
                          title="Cancelar convite"
                          disabled={isBusy}
                          className="text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {accepted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelInvite(inv.id)}
                          aria-label="Remover do histórico"
                          title="Remover do histórico"
                          disabled={isBusy}
                        >
                          <Trash2 className="h-4 w-4 text-text-muted" />
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
