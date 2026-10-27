import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getObraModule } from "@/lib/obra";
import { createExpense } from "@/lib/obra-expense";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    amount: z.number().positive().max(10_000_000),
    supplier_id: z.string().uuid().optional(),
    new_supplier_name: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["cotacao", "executada"]),
  })
  .refine((b) => Boolean(b.supplier_id) !== Boolean(b.new_supplier_name), { message: "supplier_required" });

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, amount, supplier_id, new_supplier_name, status } = parsed.data;

  const mod = await getObraModule(ctx.householdId);
  if (!mod) return NextResponse.json({ error: "no_module" }, { status: 400 });

  const result = await createExpense(createSupabaseServer(), {
    householdId: ctx.householdId,
    moduleId: mod.id,
    name,
    amount,
    supplier: supplier_id ? { id: supplier_id } : { newName: new_supplier_name! },
    status,
  });
  if (!result.ok) {
    const code = result.error === "supplier_not_found" ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status: code });
  }
  return NextResponse.json({ ok: true, supplier: result.supplier, quote: result.quote, item: result.item });
}
