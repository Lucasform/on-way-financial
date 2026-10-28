import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth-redirect";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"));

  if (!tokenHash || (type !== "recovery" && type !== "email")) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  if (type === "email") {
    const { count } = await supabase
      .from("household_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id);
    if (!count) return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
