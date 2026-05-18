"use client";

import { useState, useTransition } from "react";
import { Mail, Trash2 } from "lucide-react";
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

export function FamilyManager({ householdId, currentRole, members: initialMembers, invites: initialInvites }: Props) {
  const supabase = createSupabaseBrowser();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<HouseholdRole>("viewer");
  const [pending, start] = useTransition();
  const canManage = currentRole === "owner" || currentRole === "admin";

  function invite() {
    if (!canManage || !email) return;
    start(async () => {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", household_id: householdId, email, role }),
      });
      if (!res.ok) {
        toast.error("Falha ao convidar.");
        return;
      }
      const inv = (await res.json()) as Invite;
      setInvites((s) => [inv, ...s]);
      setEmail("");
      toast.success("Convite enviado.");
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
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                    <option value="viewer">viewer</option>
                  </select>
                ) : (
                  <Badge variant="secondary">{m.role}</Badge>
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
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={invite} disabled={pending || !email} className="w-full">
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
              return (
                <li key={inv.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <p>{inv.email ?? "—"}</p>
                    <p className="text-xs text-text-muted">{inv.role}</p>
                  </div>
                  <Badge variant={accepted ? "success" : expired ? "danger" : "warning"}>
                    {accepted ? "aceito" : expired ? "expirado" : "pendente"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
