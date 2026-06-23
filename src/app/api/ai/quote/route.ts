import { NextRequest, NextResponse } from "next/server";
import { estimateQuote } from "@/lib/ai/quote";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { item, context } = await req.json().catch(() => ({}));
  if (!item || typeof item !== "string") {
    return NextResponse.json({ error: "item required" }, { status: 400 });
  }
  try {
    const estimate = await estimateQuote(item, context);
    if (!estimate) return NextResponse.json({ error: "no_estimate" }, { status: 422 });
    return NextResponse.json({ estimate });
  } catch {
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
