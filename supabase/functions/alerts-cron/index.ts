// Supabase Edge Function (Deno) — alternativa ao Vercel Cron.
// Faça deploy com: supabase functions deploy alerts-cron
// Agende com: supabase functions schedule alerts-cron --cron "0 11 * * *"

// deno-lint-ignore-file no-explicit-any
const APP_URL = Deno.env.get("APP_URL")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

Deno.serve(async () => {
  const res = await fetch(`${APP_URL}/api/cron/alerts`, {
    method: "GET",
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  const text = await res.text();
  return new Response(text, { status: res.status });
});
