import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadActiveContext } from "@/lib/household";
import { normalizeName } from "@/lib/obra-expense";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(["material", "mão-de-obra", "equipamento", "serviço", "outro"]).default("material"),
  phone: z.string().trim().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, category, phone } = parsed.data;

  const db = createSupabaseServer();
  const { data: existing } = await db.from("suppliers").select("id, name").eq("household_id", ctx.householdId);
  const dup = (existing ?? []).find((s) => normalizeName(s.name) === normalizeName(name));
  if (dup) return NextResponse.json({ supplier: dup, created: false });

  const { data, error } = await db
    .from("suppliers")
    .insert({ household_id: ctx.householdId, name, category, phone: phone || null })
    .select("id, name")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 500 });
  return NextResponse.json({ supplier: data, created: true });
}
