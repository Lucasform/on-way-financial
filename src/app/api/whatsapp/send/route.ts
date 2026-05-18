import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

export const runtime = "nodejs";

const schema = z.object({
  to: z.string().min(8),
  body: z.string().min(1).max(1500),
  module_id: z.string().uuid().optional(),
  worker_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await sendWhatsAppText(parsed.data.to, parsed.data.body);
    if (parsed.data.module_id && parsed.data.worker_id) {
      await createSupabaseAdmin()
        .from("obra_messages")
        .insert({
          module_id: parsed.data.module_id,
          worker_id: parsed.data.worker_id,
          direction: "out",
          body: parsed.data.body,
        });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WA send", err);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
}
