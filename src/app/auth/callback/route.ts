import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/overview";

  if (code) {
    const supabase = createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("auth callback exchange", error);
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    // Se o usuário ainda não tem household, força onboarding
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { count } = await supabase
        .from("household_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!count || count === 0) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
