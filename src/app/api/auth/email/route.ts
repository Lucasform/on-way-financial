import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth-redirect";
import { sendAuthEmail } from "@/lib/email/auth-emails";
import { getServerEnv } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const email = z.string().trim().toLowerCase().email().max(254);
const next = z.string().max(200).optional();

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("recovery"), email }),
  z.object({ kind: z.literal("magiclink"), email, next }),
  z.object({ kind: z.literal("signup"), email, password: z.string().min(8).max(72), next }),
]);

const MAX_PER_HOUR = 5;
const MIN_INTERVAL_MS = 60_000;

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const body = parsed.data;
  const admin = createSupabaseAdmin();

  const { data: recent, error: logError } = await admin
    .from("auth_email_sends")
    .select("created_at")
    .eq("email", body.email)
    .eq("kind", body.kind)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString())
    .order("created_at", { ascending: false });
  if (logError) {
    console.error("auth email log read", logError);
    return NextResponse.json({ error: "Falha temporária. Tente de novo." }, { status: 500 });
  }
  const last = recent?.[0] ? Date.parse(recent[0].created_at) : 0;
  if ((recent?.length ?? 0) >= MAX_PER_HOUR || Date.now() - last < MIN_INTERVAL_MS) {
    return NextResponse.json({ error: "Espere um minuto antes de pedir outro e-mail." }, { status: 429 });
  }
  await admin.from("auth_email_sends").insert({ email: body.email, kind: body.kind });

  const { data, error } =
    body.kind === "signup"
      ? await admin.auth.admin.generateLink({ type: "signup", email: body.email, password: body.password })
      : await admin.auth.admin.generateLink({ type: body.kind, email: body.email });

  if (error || !data.properties?.hashed_token) {
    if (body.kind === "signup") {
      const exists = error?.code === "email_exists" || error?.status === 422;
      return NextResponse.json(
        { error: exists ? "Esse e-mail já tem conta. Use Entrar ou Esqueci a senha." : "Não consegui criar a conta agora." },
        { status: exists ? 409 : 500 },
      );
    }
    if (error && error.status !== 404) console.error("auth generateLink", body.kind, error);
    return NextResponse.json({ ok: true });
  }

  const target = body.kind === "recovery" ? "/reset-password" : safeNextPath(body.next);
  const verifyType = body.kind === "recovery" ? "recovery" : "email";
  const url =
    `${getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
    `&type=${verifyType}&next=${encodeURIComponent(target)}`;

  const sent = await sendAuthEmail(body.kind, body.email, url);
  if (!sent.ok) {
    console.error("auth email send", body.kind, sent.error);
    return NextResponse.json({ error: "Não consegui enviar o e-mail agora. Tente de novo em instantes." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
