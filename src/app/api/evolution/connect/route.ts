import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchInstanceStatus, fetchQrCode, isConfigured } from "@/lib/evolution/client";

export const runtime = "nodejs";

// Estado da conexão WhatsApp + QR code para parear. Usado pela UI de Configurações.
export async function GET() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ configured: false });

  try {
    const status = await fetchInstanceStatus();
    const state: string = status?.instance?.state ?? "close";
    if (state === "open") {
      return NextResponse.json({ configured: true, state, qr: null });
    }
    const conn = await fetchQrCode();
    return NextResponse.json({
      configured: true,
      state,
      qr: conn?.base64 ?? null,
      pairingCode: conn?.pairingCode ?? null,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, state: "error", qr: null });
  }
}
