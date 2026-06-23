import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

// Service-role client. Server-only. Bypasses RLS — use for webhooks/ingestion.
export function createAdminClient() {
  const env = getServerEnv();
  if (!env.supabaseServiceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente");
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
