import { redirect } from "next/navigation";

import { type ConversationListItem, ObraConversations, type ThreadMessage } from "@/components/modules/obra-conversations";
import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { loadActiveContext } from "@/lib/household";
import { getObraModule } from "@/lib/obra";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isEvolutionConfigured } from "@/lib/wa/evolution";
import { contactName, formatPhone } from "@/lib/wa/phone";

export const dynamic = "force-dynamic";

export default async function ConversasPage({ searchParams }: { searchParams: { c?: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: connection }, { data: conversations }, { data: suppliers }] = await Promise.all([
    createSupabaseAdmin().from("wa_connections").select("status").eq("household_id", ctx.householdId).maybeSingle(),
    supabase
      .from("wa_conversations")
      .select("id, phone, contact_name, supplier_id, last_message, last_message_at, unread")
      .eq("household_id", ctx.householdId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(300),
    supabase.from("suppliers").select("id, name, phone").eq("household_id", ctx.householdId).order("name"),
  ]);

  const supplierName = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const list: ConversationListItem[] = (conversations ?? []).map((c) => ({
    id: c.id,
    phone: c.phone,
    phoneLabel: formatPhone(c.phone),
    contactName: contactName(c.contact_name),
    supplierId: c.supplier_id && supplierName.has(c.supplier_id) ? c.supplier_id : null,
    title: (c.supplier_id && supplierName.get(c.supplier_id)) || contactName(c.contact_name) || formatPhone(c.phone),
    lastMessage: c.last_message,
    lastMessageAt: c.last_message_at,
    unread: c.unread,
  }));

  const selected = list.find((c) => c.id === searchParams.c) ?? null;
  const { data: messages } = selected
    ? await supabase
        .from("wa_messages")
        .select("id, direction, content, created_at")
        .eq("conversation_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(300)
    : { data: null };

  return (
    <div>
      <ObraSectionHeader title="Conversas" subtitle="Seu WhatsApp com os fornecedores, dentro do app" />
      <ObraConversations
        configured={isEvolutionConfigured()}
        status={(connection?.status as "connected" | "connecting" | "disconnected" | undefined) ?? "disconnected"}
        conversations={list}
        selected={selected}
        messages={((messages ?? []) as ThreadMessage[]).reverse()}
        suppliers={(suppliers ?? []).map((s) => ({ id: s.id, name: s.name, hasPhone: Boolean(s.phone) }))}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
