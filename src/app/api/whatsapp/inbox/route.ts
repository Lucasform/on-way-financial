import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";
import { normalizeName } from "@/lib/obra-expense";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  EvolutionError,
  fetchHistory,
  findContactNames,
  isEvolutionConfigured,
  listPhoneChats,
  mediaKindFor,
  sendMedia,
  sendText,
} from "@/lib/wa/evolution";
import { connectionFor, importHistory, openConversation, recordOutbound } from "@/lib/wa/inbox";
import { contactName, formatPhone, isLidKey, normalizePhone, phoneKeyFromJid, samePhone, sendTarget } from "@/lib/wa/phone";

export const runtime = "nodejs";
export const maxDuration = 60;

const id = z.string().uuid();
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("phone_chats") }),
  z.object({
    action: z.literal("open"),
    jid: z.string().min(5).max(120),
    name: z.string().max(120).nullish(),
    phone: z.string().regex(/^\d{10,15}$/).nullish(),
  }),
  z.object({
    action: z.literal("start"),
    phone: z.string().max(40).optional(),
    supplier_id: id.optional(),
    name: z.string().max(120).nullish(),
  }),
  z.object({ action: z.literal("send"), conversation_id: id, text: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal("history"), conversation_id: id }),
  z.object({
    action: z.literal("send_file"),
    conversation_id: id,
    url: z.string().url().max(2000),
    name: z.string().trim().min(1).max(200),
    mimetype: z.string().max(120).nullish(),
    caption: z.string().trim().max(1000).nullish(),
  }),
  z.object({ action: z.literal("link_supplier"), conversation_id: id, supplier_id: id.nullable() }),
  z.object({
    action: z.literal("create_supplier"),
    conversation_id: id,
    name: z.string().trim().min(1).max(120),
    category: z.enum(["material", "mão-de-obra", "equipamento", "serviço", "outro"]).default("material"),
  }),
  z.object({ action: z.literal("read"), conversation_id: id }),
  z.object({ action: z.literal("remove"), conversation_id: id }),
]);

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  dwg: "application/acad",
  zip: "application/zip",
};

function guessMime(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function extFor(mime: string) {
  const ext = Object.entries(MIME_BY_EXT).find(([, m]) => m === mime)?.[0];
  return ext ? `.${ext}` : "";
}

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return fail("Faça login de novo.", 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");
  const body = parsed.data;
  const householdId = ctx.householdId;
  const admin = createSupabaseAdmin();

  if (body.action === "read") {
    await admin.from("wa_conversations").update({ unread: 0 }).eq("id", body.conversation_id).eq("household_id", householdId).gt("unread", 0);
    return NextResponse.json({ ok: true });
  }
  if (ctx.role === "viewer") return fail("Só quem administra a obra usa as conversas.", 403);

  const owned = async (conversationId: string) => {
    const { data } = await admin
      .from("wa_conversations")
      .select("id, phone, wa_jid")
      .eq("id", conversationId)
      .eq("household_id", householdId)
      .maybeSingle();
    return data;
  };

  if (body.action === "link_supplier") {
    if (!(await owned(body.conversation_id))) return fail("Conversa não encontrada.", 404);
    if (body.supplier_id) {
      const { data: s } = await admin.from("suppliers").select("id").eq("id", body.supplier_id).eq("household_id", householdId).maybeSingle();
      if (!s) return fail("Fornecedor não encontrado.", 404);
    }
    await admin.from("wa_conversations").update({ supplier_id: body.supplier_id }).eq("id", body.conversation_id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create_supplier") {
    const conversation = await owned(body.conversation_id);
    if (!conversation) return fail("Conversa não encontrada.", 404);
    const { data: existing } = await admin.from("suppliers").select("id, name").eq("household_id", householdId);
    const dup = (existing ?? []).find((s) => normalizeName(s.name) === normalizeName(body.name));
    let supplierId = dup?.id ?? null;
    if (!supplierId) {
      const { data: created, error } = await admin
        .from("suppliers")
        .insert({
          household_id: householdId,
          name: body.name,
          category: body.category,
          phone: isLidKey(conversation.phone) ? null : formatPhone(conversation.phone),
        })
        .select("id")
        .single();
      if (error || !created) return fail("Não consegui cadastrar o fornecedor.", 500);
      supplierId = created.id;
    }
    await admin.from("wa_conversations").update({ supplier_id: supplierId }).eq("id", conversation.id);
    return NextResponse.json({ supplier_id: supplierId, created: !dup });
  }

  if (body.action === "remove") {
    await admin.from("wa_conversations").delete().eq("id", body.conversation_id).eq("household_id", householdId);
    return NextResponse.json({ ok: true });
  }

  if (!isEvolutionConfigured()) return fail("Servidor do WhatsApp ainda não configurado no app.");
  const connection = await connectionFor(admin, householdId);
  if (!connection || connection.status !== "connected") return fail("Conecte o WhatsApp primeiro.");
  const instance = connection.instance_name;

  try {
    if (body.action === "phone_chats") {
      const [allChats, contactNames, { data: inApp }, { data: suppliers }] = await Promise.all([
        listPhoneChats(instance),
        findContactNames(instance),
        admin.from("wa_conversations").select("phone, wa_jid").eq("household_id", householdId),
        admin.from("suppliers").select("name, phone, phone2").eq("household_id", householdId),
      ]);
      const taken = new Set((inApp ?? []).flatMap((c) => [c.phone, c.wa_jid].filter(Boolean) as string[]));
      const chats = allChats.filter((c) => !taken.has(c.jid) && !taken.has(c.phoneKey)).slice(0, 300);
      for (const c of chats) c.name = c.name ?? contactNames.get(c.jid) ?? null;

      // contato sem nome ou com número escondido: as últimas mensagens costumam trazer o nome e o número real
      const unresolved = chats.filter((c) => !c.name || isLidKey(c.phoneKey)).slice(0, 60);
      for (let i = 0; i < unresolved.length; i += 8) {
        await Promise.all(
          unresolved.slice(i, i + 8).map(async (c) => {
            try {
              const history = await fetchHistory(instance, c.jid, 20);
              const inbound = history.filter((m) => !m.fromMe).reverse();
              c.name = c.name ?? contactName(inbound.find((m) => contactName(m.pushName))?.pushName) ?? null;
              const alt = phoneKeyFromJid(history.find((m) => m.altJid)?.altJid ?? null);
              if (alt && !isLidKey(alt) && isLidKey(c.phoneKey)) c.phoneKey = alt;
            } catch {
              // sem histórico: fica como está
            }
          }),
        );
      }

      return NextResponse.json({
        chats: chats.map((c) => {
          const supplier = (suppliers ?? []).find((s) => samePhone(s.phone, c.phoneKey) || samePhone(s.phone2, c.phoneKey));
          return {
            ...c,
            supplierName: supplier?.name ?? null,
            phoneLabel: isLidKey(c.phoneKey) ? null : formatPhone(c.phoneKey),
          };
        }),
      });
    }

    if (body.action === "open") {
      const fromJid = phoneKeyFromJid(body.jid);
      if (!fromJid) return fail("Conversa inválida.");
      const phoneKey = isLidKey(fromJid) && body.phone ? body.phone : fromJid;
      const conversationId = await openConversation(admin, householdId, instance, { jid: body.jid, phoneKey, name: body.name ?? null });
      return NextResponse.json({ conversation_id: conversationId });
    }

    if (body.action === "start") {
      let phone = normalizePhone(body.phone);
      let name = body.name ?? null;
      if (body.supplier_id) {
        const { data: s } = await admin
          .from("suppliers")
          .select("id, name, phone, phone2")
          .eq("id", body.supplier_id)
          .eq("household_id", householdId)
          .maybeSingle();
        if (!s) return fail("Fornecedor não encontrado.", 404);
        phone = phone ?? normalizePhone(s.phone) ?? normalizePhone(s.phone2);
        name = name ?? s.name;
        if (!phone) return fail("Esse fornecedor não tem telefone cadastrado. Cadastre o telefone ou digite o número.");
      }
      if (!phone) return fail("Número inválido. Use DDD + número, ex.: (15) 99999-0000.");
      const conversationId = await openConversation(admin, householdId, instance, {
        jid: `${phone}@s.whatsapp.net`,
        phoneKey: phone,
        name,
        supplierId: body.supplier_id ?? null,
      });
      return NextResponse.json({ conversation_id: conversationId });
    }

    const conversation = await owned(body.conversation_id);
    if (!conversation) return fail("Conversa não encontrada.", 404);

    if (body.action === "history") {
      const count = await importHistory(admin, householdId, instance, conversation.id);
      return NextResponse.json({ count });
    }

    if (body.action === "send_file") {
      // só arquivos guardados no app (documentos, comprovantes, galeria) da própria obra
      const base = `${getServerEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/`;
      const allowed = ["obra-documents", "obra-gallery"].some((bucket) => body.url.startsWith(`${base}${bucket}/${householdId}/`));
      if (!allowed) return fail("Arquivo inválido.");
      const mimetype = body.mimetype || guessMime(body.name);
      const fileName = /\.[a-z0-9]{2,5}$/i.test(body.name) ? body.name : `${body.name}${extFor(mimetype)}`;
      const waId = await sendMedia(instance, sendTarget(conversation), { url: body.url, fileName, mimetype, caption: body.caption });
      const label = { image: "[imagem]", video: "[vídeo]", document: "[documento]" }[mediaKindFor(mimetype)];
      await recordOutbound(admin, householdId, conversation.id, `${label} ${fileName}${body.caption ? `\n${body.caption}` : ""}`, waId);
      return NextResponse.json({ ok: true });
    }

    const waId = await sendText(instance, sendTarget(conversation), body.text);
    await recordOutbound(admin, householdId, conversation.id, body.text, waId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EvolutionError && err.numberWithoutWhatsapp) return fail("Esse número não tem WhatsApp.");
    console.error("[wa] inbox", body.action, err);
    return fail("Não consegui falar com o WhatsApp agora. Confira se o celular está conectado.", 502);
  }
}
