import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { markDuplicates } from "@/lib/import/dedupe";
import { ImportRowSchema } from "@/lib/import/types";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";

const bodySchema = z.object({ rows: z.array(ImportRowSchema).min(1).max(1000) });

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (!ctx.householdId) return new NextResponse("no household", { status: 400 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const deduped = await markDuplicates(ctx.householdId, parsed.data.rows);
  return NextResponse.json({ rows: deduped });
}
