import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1).max(80),
  display_name: z.string().max(80).optional(),
  whatsapp_phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Verifica autenticação via cookies (server client)
  const sb = createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Usa admin client (service role) pra contornar RLS — autenticação já validada acima.
  const admin = createSupabaseAdmin();

  const { data: household, error: hErr } = await admin
    .from("households")
    .insert({ name: parsed.data.name.trim(), created_by: user.id })
    .select("id")
    .single();
  if (hErr || !household) {
    console.error("create household", hErr);
    return NextResponse.json(
      { error: hErr?.message ?? "insert_failed", code: hErr?.code },
      { status: 500 },
    );
  }

  // O trigger 0004_seed cria automaticamente o member como owner + categorias + métodos padrão.
  if (parsed.data.display_name || parsed.data.whatsapp_phone) {
    await admin
      .from("household_members")
      .update({
        display_name: parsed.data.display_name || null,
        whatsapp_phone: parsed.data.whatsapp_phone ? normalizePhone(parsed.data.whatsapp_phone) : null,
      })
      .eq("household_id", household.id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ household_id: household.id });
}
