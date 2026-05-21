import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { sendInviteEmail } from "@/lib/email/resend";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { HouseholdRole } from "@/types/database";

export const runtime = "nodejs";

const createSchema = z.object({
  action: z.literal("create"),
  household_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "viewer"]),
});

const acceptSchema = z.object({
  action: z.literal("accept"),
  token: z.string().min(20),
});

const schema = z.discriminatedUnion("action", [createSchema, acceptSchema]);

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "create") {
    const { household_id, email, role } = parsed.data;
    // Verifica permissão
    const { data: me } = await supabase
      .from("household_members")
      .select("role")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .single();
    if (!me || (me.role !== "owner" && me.role !== "admin")) {
      return new NextResponse("forbidden", { status: 403 });
    }
    // Nome do grupo (vai no email)
    const { data: household } = await supabase
      .from("households")
      .select("name")
      .eq("id", household_id)
      .single();

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("household_invites")
      .insert({
        household_id,
        email,
        role: role as HouseholdRole,
        token,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "fail" }, { status: 500 });

    // Envia email via Resend (servico transacional dedicado).
    // Funciona para email novo ou existente. Sandbox da Resend so entrega
    // pro email cadastrado na conta; com dominio proprio, entrega pra qualquer um.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const inviteUrl = `${appUrl}/invite/${token}`;

    const { data: inviter } = await supabase
      .from("household_members")
      .select("display_name, users:users(raw_user_meta_data)")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .maybeSingle();
    const inviterName =
      (inviter as { display_name?: string | null } | null)?.display_name ??
      user.email?.split("@")[0] ??
      null;

    const sendRes = await sendInviteEmail({
      to: email,
      inviterName,
      householdName: household?.name ?? "ON FIN",
      inviteUrl,
      role,
    });
    if (!sendRes.ok) console.error("invite email failed:", sendRes.error);

    return NextResponse.json({ ...data, email_sent: sendRes.ok, invite_url: inviteUrl });
  }

  // accept
  const { token } = parsed.data;
  const admin = createSupabaseAdmin();
  const { data: invite } = await admin
    .from("household_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "invalid" }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "already_accepted" }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "expired" }, { status: 410 });

  const { error: insertErr } = await admin
    .from("household_members")
    .upsert(
      { household_id: invite.household_id, user_id: user.id, role: invite.role },
      { onConflict: "household_id,user_id" },
    );
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await admin
    .from("household_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, household_id: invite.household_id });
}
