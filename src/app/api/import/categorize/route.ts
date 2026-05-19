import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { categorizeBatch } from "@/lib/import/ai-categorize";
import { markDuplicates } from "@/lib/import/dedupe";
import { ImportRowSchema } from "@/lib/import/types";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (!ctx.householdId) return new NextResponse("no household", { status: 400 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: categories } = await admin
    .from("categories")
    .select("name, type")
    .eq("household_id", ctx.householdId);

  const suggestions = await categorizeBatch({
    rows: parsed.data.rows.map((r) => ({
      tmp_id: r.tmp_id,
      description: r.description,
      type: r.type,
      amount: r.amount,
    })),
    categories: categories ?? [],
  });

  const byId = new Map(suggestions.map((s) => [s.tmp_id, s]));
  const enriched = parsed.data.rows.map((r) => {
    const s = byId.get(r.tmp_id);
    return {
      ...r,
      category_hint: s?.category ?? r.category_hint ?? null,
      payment_hint: (s?.payment ?? r.payment_hint ?? null) as typeof r.payment_hint,
    };
  });

  const deduped = await markDuplicates(ctx.householdId, enriched);
  return NextResponse.json({ rows: deduped });
}
