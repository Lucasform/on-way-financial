import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseStatement } from "@/lib/import";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { filename, content } = await req.json().catch(() => ({}));
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  try {
    const items = parseStatement(filename || "file.csv", content).slice(0, 500);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "parse_error" }, { status: 422 });
  }
}
