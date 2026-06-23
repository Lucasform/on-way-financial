import { NextRequest, NextResponse } from "next/server";
import { parseExpense } from "@/lib/ai/parse-expense";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Lançamento por IA dentro do app: usuário digita em linguagem natural,
// devolve o parse para confirmação na UI (não grava direto).
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { text } = await req.json().catch(() => ({ text: "" }));
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  try {
    const parsed = await parseExpense(text, today);
    if (!parsed) return NextResponse.json({ error: "no_parse" }, { status: 422 });
    return NextResponse.json({ parsed });
  } catch (e) {
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
