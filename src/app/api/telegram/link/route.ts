import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/telegram/link
 * Gera um token de vínculo de 15 minutos e devolve a deep link
 *   https://t.me/<bot_username>?start=<token>
 * para o usuário clicar e abrir no Telegram.
 */
export async function POST(_req: NextRequest) {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_USERNAME) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (!ctx.householdId) return new NextResponse("no household", { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: member } = await admin
    .from("household_members")
    .select("id")
    .eq("household_id", ctx.householdId)
    .eq("user_id", ctx.userId)
    .single();

  if (!member) return new NextResponse("member not found", { status: 404 });

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  const { error } = await admin.from("telegram_link_tokens").insert({
    token,
    member_id: member.id,
    household_id: ctx.householdId,
    expires_at: expiresAt,
  });
  if (error) {
    console.error("link token insert", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deepLink = `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${token}`;
  return NextResponse.json({ token, deep_link: deepLink, expires_at: expiresAt });
}
