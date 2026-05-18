import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default("ON WAY FINANCIAL"),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(10),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8),
  WHATSAPP_APP_SECRET: z.string().min(8),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  CRON_SECRET: z.string().min(16),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

let cachedServer: ServerEnv | null = null;
let cachedPublic: PublicEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Server env inválida. Verifique .env.local");
  }
  cachedServer = parsed.data;
  return cachedServer;
}

export function getPublicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });
  if (!parsed.success) {
    console.error("❌ Variáveis públicas inválidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Public env inválida.");
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}
