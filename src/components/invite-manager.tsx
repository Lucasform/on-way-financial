"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, Trash2, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

type Invite = { id: string; email: string | null; role: string; token: string; accepted: boolean };

export function InviteManager({
  householdId,
  invites,
  appUrl,
}: {
  householdId: string;
  invites: Invite[];
  appUrl: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState("member");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const link = (t: string) => `${appUrl}/invite/${t}`;

  async function create() {
    setCreating(true);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("household_invites").insert({
      household_id: householdId,
      role,
      invited_by: auth.user?.id,
    });
    setCreating(false);
    router.refresh();
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(link(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  async function remove(id: string) {
    await supabase.from("household_invites").delete().eq("id", id);
    router.refresh();
  }

  const pending = invites.filter((i) => !i.accepted);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-40">
          <option value="member">Membro</option>
          <option value="admin">Admin</option>
          <option value="viewer">Visualizador</option>
        </Select>
        <Button onClick={create} loading={creating}>
          <Plus className="h-4 w-4" /> Gerar convite
        </Button>
      </div>

      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2">
              <Link2 className="h-4 w-4 shrink-0 text-muted" />
              <span className="flex-1 truncate text-xs text-fg-soft">{link(i.token)}</span>
              <button onClick={() => copy(i.token)} className="grid h-7 w-7 place-items-center rounded-lg text-fg-soft hover:bg-surface hover:text-brand">
                {copied === i.token ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => remove(i.id)} className="grid h-7 w-7 place-items-center rounded-lg text-fg-soft hover:bg-surface hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        Gere o link e mande pra pessoa (ex: sua esposa). Ela cria a conta e entra na sua família automaticamente.
      </p>
    </div>
  );
}
