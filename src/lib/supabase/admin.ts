import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let _admin: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Cliente Supabase com service role. NUNCA importar em código de cliente.
 */
export function createSupabaseAdmin() {
  if (_admin) return _admin;
  const env = getServerEnv();
  _admin = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-on-way": "admin" } },
  });
  return _admin;
}
