import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Telegram desativado: o Lucas não vai usar esse canal. Só confirma recebimento
// pro Telegram parar de reenviar, sem processar nada.
export async function POST() {
  return new NextResponse("ok", { status: 200 });
}
