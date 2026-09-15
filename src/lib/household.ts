import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import { createSupabaseServer } from "@/lib/supabase/server";
import type { HouseholdRole } from "@/types/database";

export const HOUSEHOLD_COOKIE = "current_household_id";
export const USER_ID_HEADER = "x-uid";

export interface ActiveContext {
  userId: string;
  householdId: string;
  role: HouseholdRole;
  households: { id: string; name: string; role: HouseholdRole }[];
}

/**
 * Carrega usuário, household ativa (cookie) e a lista de households do usuário.
 * Retorna null se não estiver autenticado. Se autenticado sem nenhuma household, householdId="".
 *
 * Duas otimizações que importam MUITO aqui porque essa função roda (ao menos 1x, via cache())
 * em toda navegação:
 * 1. `cache()`: layout e página chamam isso no mesmo request — sem isso cada navegação batia
 *    2x no Supabase (auth + household_members) em série.
 * 2. Não chama supabase.auth.getUser() de novo se o middleware já validou o usuário nesse
 *    mesmo request (repassa o id via header x-uid, ver middleware.ts) — evita um round-trip
 *    inteiro pro Auth server que seria só uma repetição do que o middleware já fez.
 */
export const loadActiveContext = cache(async (): Promise<ActiveContext | null> => {
  const supabase = createSupabaseServer();

  let userId = headers().get(USER_ID_HEADER);
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data: members } = await supabase
    .from("household_members")
    .select("household_id, role, households:households(id,name)")
    .eq("user_id", userId);

  const households =
    (members ?? [])
      .map((m) => {
        const h = (m as { households: { id: string; name: string } | null }).households;
        if (!h) return null;
        return { id: h.id, name: h.name, role: m.role as HouseholdRole };
      })
      .filter((x): x is { id: string; name: string; role: HouseholdRole } => x !== null) ?? [];

  if (households.length === 0) {
    return { userId, householdId: "", role: "viewer", households: [] };
  }

  const cookieStore = cookies();
  const fromCookie = cookieStore.get(HOUSEHOLD_COOKIE)?.value;
  const active = households.find((h) => h.id === fromCookie) ?? households[0]!;

  return {
    userId,
    householdId: active.id,
    role: active.role,
    households,
  };
});

export function canWrite(role: HouseholdRole): boolean {
  return role === "owner" || role === "admin";
}
