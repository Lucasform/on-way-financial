import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadActiveContext } from "@/lib/household";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

export const runtime = "nodejs";

const schema = z.object({
  body: z.string().min(1).max(1500),
  module_id: z.string().uuid(),
  worker_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: worker } = await admin
    .from("obra_workers")
    .select("id, whatsapp_phone, module_id, modules:modules(household_id)")
    .eq("id", parsed.data.worker_id)
    .eq("module_id", parsed.data.module_id)
    .single();
  const household = (worker as { modules: { household_id: string } | null } | null)?.modules?.household_id;
  if (!worker || household !== ctx.householdId) return new NextResponse("not_found", { status: 404 });
  if (!worker.whatsapp_phone) return NextResponse.json({ error: "no_phone" }, { status: 422 });

  try {
    await sendWhatsAppText(worker.whatsapp_phone, parsed.data.body);
    await admin.from("obra_messages").insert({
      module_id: parsed.data.module_id,
      worker_id: parsed.data.worker_id,
      direction: "out",
      body: parsed.data.body,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WA send", err);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
}
