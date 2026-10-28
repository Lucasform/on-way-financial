import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const subscribeSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
});

const unsubscribeSchema = z.object({ endpoint: z.string().url().max(1000) });

async function currentUserId(): Promise<string | null> {
  const { data } = await createSupabaseServer().auth.getUser();
  return data.user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  const { error } = await createSupabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    console.error("push subscribe", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = unsubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await createSupabaseAdmin()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
