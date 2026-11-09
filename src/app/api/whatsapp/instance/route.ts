import { type NextRequest,NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ensureInstance,
  EvolutionError,
  getConnectionState,
  getQrCode,
  isEvolutionConfigured,
  logoutInstance,
  setWebhook,
} from "@/lib/wa/evolution";
import { connectionFor } from "@/lib/wa/inbox";

export const runtime = "nodejs";
export const maxDuration = 60;

const STATUS = { open: "connected", connecting: "connecting", close: "disconnected" } as const;

export async function POST(request: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const { action } = (await request.json().catch(() => ({}))) as { action?: "connect" | "status" | "logout" };
  if (action !== "status" && ctx.role === "viewer") {
    return NextResponse.json({ error: "Só quem administra a obra conecta o WhatsApp." }, { status: 403 });
  }
  if (!isEvolutionConfigured()) {
    return NextResponse.json({ error: "Servidor do WhatsApp ainda não configurado no app." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const connection = await connectionFor(admin, ctx.householdId);
  if (!connection) return NextResponse.json({ error: "Não consegui preparar a conexão." }, { status: 500 });
  const instance = connection.instance_name;
  const setStatus = (status: "connected" | "connecting" | "disconnected") =>
    admin.from("wa_connections").update({ status, updated_at: new Date().toISOString() }).eq("household_id", ctx.householdId);

  try {
    if (action === "logout") {
      await logoutInstance(instance);
      await setStatus("disconnected");
      return NextResponse.json({ status: "disconnected" });
    }

    if (action === "connect") {
      await ensureInstance(instance);
      const origin = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
      await setWebhook(instance, `${origin}/api/whatsapp/evolution?secret=${connection.webhook_secret}`);
    }

    const state = await getConnectionState(instance);
    if (state === "open" || action !== "connect") {
      await setStatus(STATUS[state]);
      return NextResponse.json({ status: STATUS[state] });
    }

    const { qr, pairingCode } = await getQrCode(instance);
    await setStatus("connecting");
    return NextResponse.json({ status: "connecting", qr, pairingCode });
  } catch (err) {
    const detail = err instanceof EvolutionError ? ` (código ${err.status})` : "";
    console.error("[wa] instância", action, err);
    return NextResponse.json({ error: `Não consegui falar com o servidor do WhatsApp${detail}.` }, { status: 502 });
  }
}
