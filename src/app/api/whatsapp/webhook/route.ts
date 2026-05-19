import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { handleIncoming } from "@/lib/whatsapp/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const env = getServerEnv();
  if (!env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse("whatsapp not configured", { status: 503 });
  }
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const env = getServerEnv();
  if (!env.WHATSAPP_APP_SECRET) {
    return new NextResponse("whatsapp not configured", { status: 503 });
  }
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  const expected = "sha256=" + crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(raw).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // Responde 200 rápido pro Meta. handleIncoming roda em background com .catch.
  void handleIncoming(payload as Parameters<typeof handleIncoming>[0]).catch((err) =>
    console.error("WA handleIncoming", err),
  );
  return new NextResponse("ok", { status: 200 });
}
