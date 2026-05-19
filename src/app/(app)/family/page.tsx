import Link from "next/link";
import { Plus } from "lucide-react";

import { FamilyManager } from "@/components/common/family-manager";
import { Button } from "@/components/ui/button";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("household_members")
      .select("id, user_id, role, display_name, whatsapp_phone, created_at")
      .eq("household_id", ctx.householdId)
      .order("role"),
    supabase
      .from("household_invites")
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .eq("household_id", ctx.householdId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Grupo financeiro</h1>
          <p className="text-sm text-text-muted">Convide pessoas pra ver e lançar transações junto com você.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/onboarding">
            <Plus className="h-4 w-4" /> Novo grupo financeiro
          </Link>
        </Button>
      </header>
      <FamilyManager
        householdId={ctx.householdId}
        currentRole={ctx.role}
        members={members ?? []}
        invites={invites ?? []}
      />
    </div>
  );
}
