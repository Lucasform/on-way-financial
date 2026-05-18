import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { parseFreeText } from "@/lib/ai/parser";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({ text: z.string().min(1).max(1000) });

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  try {
    const parsed = await parseFreeText(body.data.text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("ai parse", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}
