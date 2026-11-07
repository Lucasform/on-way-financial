import "server-only";

import { normalizeName } from "@/lib/obra-expense";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createSupabaseAdmin>;

export interface PartnerLink {
  id: string;
  household_id: string;
  household_name: string;
}

export interface PendingIncoming {
  id: string;
  requester_household_name: string;
}

export interface PendingOutgoing {
  id: string;
  invite_email: string;
}

export interface SharedEntry {
  key: string;
  name: string;
  category: string | null;
  phone: string | null;
  sharedBy: { household_id: string; household_name: string; supplier_id: string; mine: boolean }[];
  /** fornecedor da obra atual com esse nome (se já existe aqui) */
  localSupplierId: string | null;
  /** fornecedor de uma obra parceira pra copiar, quando ainda não existe aqui */
  copyFromId: string | null;
}

export interface SharedDirectory {
  partners: PartnerLink[];
  incoming: PendingIncoming[];
  outgoing: PendingOutgoing[];
  entries: SharedEntry[];
}

export async function partnerHouseholdIds(admin: Admin, householdId: string): Promise<{ linkId: string; householdId: string }[]> {
  const { data } = await admin
    .from("household_partners")
    .select("id, requester_household_id, partner_household_id")
    .eq("status", "accepted")
    .or(`requester_household_id.eq.${householdId},partner_household_id.eq.${householdId}`);
  return (data ?? [])
    .map((r) => ({
      linkId: r.id,
      householdId: r.requester_household_id === householdId ? r.partner_household_id : r.requester_household_id,
    }))
    .filter((r): r is { linkId: string; householdId: string } => !!r.householdId);
}

export async function loadSharedDirectory(householdId: string, userEmail: string | null): Promise<SharedDirectory> {
  const admin = createSupabaseAdmin();
  const links = await partnerHouseholdIds(admin, householdId);
  const partnerIds = links.map((l) => l.householdId);

  const [{ data: incomingRows }, { data: outgoingRows }] = await Promise.all([
    userEmail
      ? admin
          .from("household_partners")
          .select("id, requester_household_id")
          .eq("status", "pending")
          .eq("invite_email", userEmail.trim().toLowerCase())
          .neq("requester_household_id", householdId)
      : Promise.resolve({ data: [] as { id: string; requester_household_id: string }[] }),
    admin.from("household_partners").select("id, invite_email").eq("status", "pending").eq("requester_household_id", householdId),
  ]);

  const householdIds = [...new Set([householdId, ...partnerIds, ...(incomingRows ?? []).map((r) => r.requester_household_id)])];
  const { data: households } = await admin.from("households").select("id, name").in("id", householdIds);
  const hName = new Map((households ?? []).map((h) => [h.id, h.name]));

  const [{ data: shared }, { data: mine }] = await Promise.all([
    admin
      .from("suppliers")
      .select("id, household_id, name, category, phone")
      .eq("shared", true)
      .in("household_id", [householdId, ...partnerIds]),
    admin.from("suppliers").select("id, name").eq("household_id", householdId),
  ]);
  const mineByName = new Map((mine ?? []).map((s) => [normalizeName(s.name), s.id]));

  const groups = new Map<string, SharedEntry>();
  for (const s of shared ?? []) {
    const key = normalizeName(s.name);
    let e = groups.get(key);
    if (!e) {
      e = { key, name: s.name, category: s.category, phone: s.phone, sharedBy: [], localSupplierId: mineByName.get(key) ?? null, copyFromId: null };
      groups.set(key, e);
    }
    const isMine = s.household_id === householdId;
    e.sharedBy.push({ household_id: s.household_id, household_name: hName.get(s.household_id) ?? "Obra", supplier_id: s.id, mine: isMine });
    if (isMine) {
      e.name = s.name;
      e.category = s.category ?? e.category;
      e.phone = s.phone ?? e.phone;
    } else {
      e.category = e.category ?? s.category;
      e.phone = e.phone ?? s.phone;
      if (!e.copyFromId) e.copyFromId = s.id;
    }
  }

  return {
    partners: links.map((l) => ({ id: l.linkId, household_id: l.householdId, household_name: hName.get(l.householdId) ?? "Obra" })),
    incoming: (incomingRows ?? []).map((r) => ({ id: r.id, requester_household_name: hName.get(r.requester_household_id) ?? "Obra" })),
    outgoing: (outgoingRows ?? []).map((r) => ({ id: r.id, invite_email: r.invite_email })),
    entries: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
