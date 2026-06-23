import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ActiveContext = {
  userId: string;
  email: string | null;
  householdId: string | null;
  householdName: string | null;
};

// Carrega o household ativo do usuário (primeiro membership).
// Cria household padrão no primeiro acesso.
// `cache()` deduplica chamadas dentro do mesmo render (layout + página).
export const loadActiveContext = cache(async (): Promise<ActiveContext | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, households(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    return {
      userId: user.id,
      email: user.email ?? null,
      householdId: membership.household_id,
      householdName: (membership.households as any)?.name ?? null,
    };
  }

  // bootstrap: cria household + membership owner
  const { data: hh } = await supabase
    .from("households")
    .insert({ name: "Minha casa", created_by: user.id })
    .select("id, name")
    .single();

  if (hh) {
    await supabase.from("household_members").insert({
      household_id: hh.id,
      user_id: user.id,
      role: "owner",
      display_name: user.email,
    });
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    householdId: hh?.id ?? null,
    householdName: hh?.name ?? null,
  };
});
