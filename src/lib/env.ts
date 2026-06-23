function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function opt(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function getServerEnv() {
  return {
    supabaseUrl: req("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: req("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceKey: opt("SUPABASE_SERVICE_ROLE_KEY"),
    anthropicKey: opt("ANTHROPIC_API_KEY"),
    aiParseModel: process.env.AI_PARSE_MODEL || "claude-haiku-4-5-20251001",
    telegramToken: opt("TELEGRAM_BOT_TOKEN"),
    telegramUsername: opt("TELEGRAM_BOT_USERNAME"),
    telegramWebhookSecret: opt("TELEGRAM_WEBHOOK_SECRET"),
    evolutionUrl: opt("EVOLUTION_API_URL"),
    evolutionKey: opt("EVOLUTION_API_KEY"),
    evolutionInstance: opt("EVOLUTION_INSTANCE"),
    evolutionWebhookSecret: opt("EVOLUTION_WEBHOOK_SECRET"),
    cronSecret: opt("CRON_SECRET"),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}

export function getPublicEnv() {
  // Acesso LITERAL a process.env.NEXT_PUBLIC_* — obrigatório para o Next injetar
  // os valores no bundle do navegador. Acesso dinâmico (process.env[name]) não é
  // substituído e fica undefined no cliente, quebrando o createClient.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return {
    supabaseUrl,
    supabaseAnonKey,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}
