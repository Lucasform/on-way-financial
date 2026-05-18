"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowser() {
  if (_client) return _client;
  const env = getPublicEnv();
  _client = createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return _client;
}
