"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

// Instância única no navegador. Criar vários clients faz o GoTrue brigar pelo
// navigator.locks e congelar a aba — por isso memoizamos e desligamos o lock.
let cached: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (cached) return cached;
  const env = getPublicEnv();
  cached = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      // passthrough: não usa navigator.locks (evita deadlock que trava o app)
      lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
    },
  });
  return cached;
}
