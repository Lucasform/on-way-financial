import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { emailLayout, escapeHtml, sendResendEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";
import { normalizeName } from "@/lib/obra-expense";
import { partnerHouseholdIds } from "@/lib/shared-suppliers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), email: z.string().trim().toLowerCase().email().max(254) }),
  z.object({ action: z.literal("accept"), link_id: z.string().uuid() }),
  z.object({ action: z.literal("decline"), link_id: z.string().uuid() }),
  z.object({ action: z.literal("disconnect"), link_id: z.string().uuid() }),
  z.object({ action: z.literal("copy"), supplier_id: z.string().uuid() }),
]);

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const body = parsed.data;

  const db = createSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const myEmail = user.email?.trim().toLowerCase() ?? "";
  const admin = createSupabaseAdmin();

  if (body.action === "request") {
    if (body.email === myEmail) return NextResponse.json({ error: "own_email" }, { status: 400 });
    const { data: existing } = await admin
      .from("household_partners")
      .select("id")
      .eq("requester_household_id", ctx.householdId)
      .eq("invite_email", body.email)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, already: true });

    const { data: link, error } = await admin
      .from("household_partners")
      .insert({ requester_household_id: ctx.householdId, invite_email: body.email, created_by: user.id })
      .select("id")
      .single();
    if (error || !link) return NextResponse.json({ error: "save_failed" }, { status: 500 });

    const env = getServerEnv();
    const appName = env.NEXT_PUBLIC_APP_NAME ?? "On Obra";
    const { data: household } = await admin.from("households").select("name").eq("id", ctx.householdId).maybeSingle();
    const obra = household?.name ?? "uma obra";
    const url = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/overview/fornecedores/compartilhados`;
    const sent = await sendResendEmail({
      to: body.email,
      subject: `${obra} quer compartilhar fornecedores com você`,
      html: emailLayout({
        appName,
        title: "Compartilhar fornecedores",
        bodyHtml: `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#d4d4d4">A obra <strong style="color:#fff">${escapeHtml(obra)}</strong> quer trocar fornecedores com a sua.</p><p style="margin:0;font-size:14px;line-height:1.5;color:#a3a3a3">Aceitando, cada obra vê os fornecedores que a outra marcar como compartilhados. Custos, cotações e pagamentos continuam só de cada uma.</p>`,
        ctaLabel: "Ver pedido",
        ctaUrl: url,
        footer: "Se você não conhece essa obra, é só ignorar.",
      }),
      text: `A obra ${obra} quer compartilhar fornecedores com a sua. Veja em ${url}`,
    });
    if (!sent.ok) console.error("partner request email", sent.error);
    return NextResponse.json({ ok: true, email_sent: sent.ok });
  }

  if (body.action === "accept" || body.action === "decline") {
    const { data: link } = await admin.from("household_partners").select("*").eq("id", body.link_id).eq("status", "pending").maybeSingle();
    if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const isInvitee = link.invite_email === myEmail;
    const isRequester = link.requester_household_id === ctx.householdId;
    if (body.action === "decline") {
      if (!isInvitee && !isRequester) return NextResponse.json({ error: "forbidden" }, { status: 403 });
      await admin.from("household_partners").delete().eq("id", link.id);
      return NextResponse.json({ ok: true });
    }
    if (!isInvitee) return NextResponse.json({ error: "wrong_account" }, { status: 403 });
    if (link.requester_household_id === ctx.householdId) return NextResponse.json({ error: "same_household" }, { status: 400 });
    const { error } = await admin
      .from("household_partners")
      .update({ partner_household_id: ctx.householdId, status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", link.id)
      .eq("status", "pending");
    if (error) {
      if (error.code === "23505") {
        await admin.from("household_partners").delete().eq("id", link.id);
        return NextResponse.json({ ok: true, already: true });
      }
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "disconnect") {
    const { data: link } = await admin.from("household_partners").select("*").eq("id", body.link_id).maybeSingle();
    if (!link || (link.requester_household_id !== ctx.householdId && link.partner_household_id !== ctx.householdId)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await admin.from("household_partners").delete().eq("id", link.id);
    return NextResponse.json({ ok: true });
  }

  // copy: traz um fornecedor compartilhado de uma obra parceira pra obra atual
  const partners = (await partnerHouseholdIds(admin, ctx.householdId)).map((p) => p.householdId);
  const { data: source } = await admin
    .from("suppliers")
    .select("id, household_id, name, category, phone, phone2, cnpj, address")
    .eq("id", body.supplier_id)
    .eq("shared", true)
    .maybeSingle();
  if (!source || !partners.includes(source.household_id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: mine } = await db.from("suppliers").select("id, name").eq("household_id", ctx.householdId);
  const dup = (mine ?? []).find((s) => normalizeName(s.name) === normalizeName(source.name));
  if (dup) {
    await db.from("suppliers").update({ shared: true, shared_source_id: source.id }).eq("id", dup.id);
    return NextResponse.json({ supplier: dup, created: false });
  }

  const { data: created, error } = await db
    .from("suppliers")
    .insert({
      household_id: ctx.householdId,
      name: source.name,
      category: source.category,
      phone: source.phone,
      phone2: source.phone2,
      cnpj: source.cnpj,
      address: source.address,
      shared: true,
      shared_source_id: source.id,
    })
    .select("id, name")
    .single();
  if (error || !created) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ supplier: created, created: true });
}
