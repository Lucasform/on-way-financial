import { addDays, addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";

import { todayISO } from "@/lib/dates";
import { getServerEnv } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RecRow {
  id: string;
  household_id: string;
  type: "expense" | "income" | "transfer";
  amount: number | string;
  description: string;
  category_id: string | null;
  payment_method_id: string | null;
  notes: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_month: number | null;
  day_of_week: number | null;
  end_date: string | null;
  next_run: string;
  created_by: string;
}

export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const auth = req.headers.get("authorization");
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== env.CRON_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const today = todayISO();

  const { data: rows, error } = await admin
    .from("recurring_transactions")
    .select(
      "id, household_id, type, amount, description, category_id, payment_method_id, notes, frequency, day_of_month, day_of_week, end_date, next_run, created_by",
    )
    .eq("active", true)
    .lte("next_run", today);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let materialized = 0;
  let deactivated = 0;

  for (const r of (rows ?? []) as RecRow[]) {
    try {
      // Pode haver atraso (cron falhou alguns dias): roda enquanto next_run <= hoje
      let cursor = r.next_run;
      while (cursor <= today) {
        if (r.end_date && cursor > r.end_date) break;
        const { error: insErr } = await admin.from("transactions").insert({
          household_id: r.household_id,
          type: r.type,
          amount: Number(r.amount),
          description: r.description,
          category_id: r.category_id,
          payment_method_id: r.payment_method_id,
          notes: r.notes,
          occurred_at: cursor,
          source: "web",
          created_by: r.created_by,
        });
        if (insErr) {
          console.error("recurring materialize", r.id, insErr);
          break;
        }
        materialized += 1;
        cursor = computeNext(cursor, r);
      }

      const shouldDeactivate = r.end_date != null && cursor > r.end_date;
      const update: { next_run: string; last_run: string; active?: boolean } = {
        next_run: cursor,
        last_run: today,
      };
      if (shouldDeactivate) {
        update.active = false;
        deactivated += 1;
      }
      await admin.from("recurring_transactions").update(update).eq("id", r.id);
    } catch (err) {
      console.error("recurring loop", r.id, err);
    }
  }

  return NextResponse.json({ ok: true, evaluated: rows?.length ?? 0, materialized, deactivated });
}

function computeNext(currentISO: string, r: RecRow): string {
  const d = parseISO(currentISO);
  switch (r.frequency) {
    case "daily":
      return format(addDays(d, 1), "yyyy-MM-dd");
    case "weekly":
      return format(addWeeks(d, 1), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(d, 1), "yyyy-MM-dd");
    case "yearly":
      return format(addYears(d, 1), "yyyy-MM-dd");
  }
}
