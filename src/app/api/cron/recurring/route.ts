import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

function advance(date: string, freq: string): string {
  const d = new Date(date);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// Materializa recorrências vencidas em transações. Chamado pelo Vercel Cron.
export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const auth = req.headers.get("authorization");
  if (env.cronSecret && auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rules } = await db
    .from("recurring_rules")
    .select("*")
    .eq("active", true)
    .lte("next_run", today);

  let created = 0;
  for (const r of rules ?? []) {
    // avança até alcançar hoje (cobre execuções perdidas)
    let next = r.next_run as string;
    let guard = 0;
    while (next <= today && guard < 60) {
      await db.from("transactions").insert({
        household_id: r.household_id,
        account_id: r.account_id,
        category_id: r.category_id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        occurred_on: next,
        source: "recurring",
      });
      created++;
      next = advance(next, r.frequency);
      guard++;
    }
    await db.from("recurring_rules").update({ next_run: next }).eq("id", r.id);
  }

  return NextResponse.json({ ok: true, created });
}
