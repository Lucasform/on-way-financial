import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Login/signup pelo servidor: evita o travamento do SDK no navegador
// (navigator.locks) e grava os cookies de sessão na resposta.
export async function POST(req: NextRequest) {
  const { email, password, mode } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const supabase = createClient();
  const { error } =
    mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
