import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ImportRowSchema } from "@/lib/import/types";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (!ctx.householdId) return new NextResponse("no household", { status: 400 });
  if (ctx.role === "viewer") return new NextResponse("forbidden", { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createSupabaseAdmin();
  const [{ data: categories }, { data: methods }] = await Promise.all([
    admin.from("categories").select("id, name, type").eq("household_id", ctx.householdId),
    admin
      .from("payment_methods")
      .select("id, kind, is_default")
      .eq("household_id", ctx.householdId)
      .is("archived_at", null),
  ]);

  function findCategoryId(name: string | null | undefined, type: "expense" | "income" | "transfer"): string | null {
    if (!name) return null;
    const list = (categories ?? []).filter((c) => c.type === (type === "income" ? "income" : "expense"));
    const exact = list.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exact) return exact.id;
    const partial = list.find(
      (c) => c.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.name.toLowerCase()),
    );
    return partial?.id ?? null;
  }

  function findMethodId(kind: string | null | undefined): string | null {
    if (kind) {
      const m = (methods ?? []).find((x) => x.kind === kind);
      if (m) return m.id;
    }
    const def = (methods ?? []).find((m) => m.is_default);
    return def?.id ?? null;
  }

  const toInsert = parsed.data.rows
    .filter((r) => r.selected && !r.is_duplicate)
    .map((r) => ({
      household_id: ctx.householdId,
      type: r.type,
      amount: r.amount,
      description: r.description,
      occurred_at: r.occurred_at,
      category_id: findCategoryId(r.category_hint, r.type),
      payment_method_id: findMethodId(r.payment_hint),
      source: "import" as const,
      notes: r.notes ?? null,
      created_by: ctx.userId,
    }));

  if (toInsert.length === 0) return NextResponse.json({ inserted: 0 });

  const { error, count } = await admin.from("transactions").insert(toInsert, { count: "exact" });
  if (error) {
    console.error("import commit", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ inserted: count ?? toInsert.length });
}
