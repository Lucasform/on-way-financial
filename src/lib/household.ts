import "server-only";

import { cookies } from "next/headers";

import { createSupabaseServer } from "@/lib/supabase/server";
import type { HouseholdRole } from "@/types/database";

export const HOUSEHOLD_COOKIE = "current_household_id";

export interface ActiveContext {
  userId: string;
  householdId: string;
  role: HouseholdRole;
  households: { id: string; name: string; role: HouseholdRole }[];
}

/**
 * Carrega usuário, household ativa (cookie) e a lista de households do usuário.
 * Retorna null se não estiver autenticado. Se autenticado sem nenhuma household, householdId="".
 */
export async function loadActiveContext(): Promise<ActiveContext | null> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: members } = await supabase
    .from("household_members")
    .select("household_id, role, households:households(id,name)")
    .eq("user_id", user.id);

  const households =
    (members ?? [])
      .map((m) => {
        const h = (m as { households: { id: string; name: string } | null }).households;
        if (!h) return null;
        return { id: h.id, name: h.name, role: m.role as HouseholdRole };
      })
      .filter((x): x is { id: string; name: string; role: HouseholdRole } => x !== null) ?? [];

  if (households.length === 0) {
    return { userId: user.id, householdId: "", role: "viewer", households: [] };
  }

  const cookieStore = cookies();
  const fromCookie = cookieStore.get(HOUSEHOLD_COOKIE)?.value;
  const active = households.find((h) => h.id === fromCookie) ?? households[0]!;

  return {
    userId: user.id,
    householdId: active.id,
    role: active.role,
    households,
  };
}

export function canWrite(role: HouseholdRole): boolean {
  return role === "owner" || role === "admin";
}
