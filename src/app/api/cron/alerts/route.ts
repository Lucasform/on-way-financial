import { NextResponse, type NextRequest } from "next/server";

import { fmtDate, monthRangeISO, todayISO } from "@/lib/dates";
import { getServerEnv } from "@/lib/env";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AlertRow {
  id: string;
  household_id: string;
  kind: string;
  name: string;
  config: Record<string, unknown>;
  target_member_ids: string[];
  frequency: string;
}

export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const auth = req.headers.get("authorization");
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== env.CRON_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: alerts } = await admin
    .from("alerts")
    .select("id, household_id, kind, name, config, target_member_ids, frequency")
    .eq("active", true);

  let fired = 0;
  for (const a of (alerts ?? []) as AlertRow[]) {
    if (a.frequency === "immediate") continue; // imediatos disparam por inserção
    try {
      const triggered = await evaluate(a);
      if (!triggered) continue;
      await notifyTargets(a, triggered);
      await admin.from("alerts").update({ last_triggered_at: new Date().toISOString() }).eq("id", a.id);
      fired += 1;
    } catch (err) {
      console.error("alert eval", a.id, err);
    }
  }
  return NextResponse.json({ ok: true, evaluated: alerts?.length ?? 0, fired });
}

async function evaluate(a: AlertRow): Promise<string | null> {
  const admin = createSupabaseAdmin();
  switch (a.kind) {
    case "budget_exceeded": {
      const categoryId = a.config.category_id as string | undefined;
      const limit = Number(a.config.limit ?? 0);
      if (!categoryId || limit <= 0) return null;
      const { start, end } = monthRangeISO();
      const { data } = await admin
        .from("transactions")
        .select("amount, categories:categories(name)")
        .eq("household_id", a.household_id)
        .eq("type", "expense")
        .eq("category_id", categoryId)
        .gte("occurred_at", start)
        .lte("occurred_at", end);
      const sum = (data ?? []).reduce((s, t) => s + Number(t.amount), 0);
      if (sum >= limit) {
        const catName = (data?.[0] as { categories: { name: string } | null } | undefined)?.categories?.name ?? "Categoria";
        return `🚨 *${a.name}*\n${catName}: ${formatBRL(sum)} (limite ${formatBRL(limit)})`;
      }
      return null;
    }
    case "invoice_closing": {
      const { data } = await admin
        .from("payment_methods")
        .select("name, closing_day, due_day")
        .eq("household_id", a.household_id)
        .eq("kind", "credit_card")
        .is("archived_at", null);
      const today = new Date(todayISO());
      const due = (data ?? []).filter((m) => m.closing_day && Math.abs(m.closing_day - today.getDate()) <= 1);
      if (due.length === 0) return null;
      return `📅 *${a.name}*\nFatura fechando em breve: ${due.map((m) => m.name).join(", ")}`;
    }
    case "goal_progress": {
      const moduleId = a.config.module_id as string | undefined;
      if (!moduleId) return null;
      const { data: mod } = await admin.from("modules").select("name, budget").eq("id", moduleId).single();
      if (!mod?.budget) return null;
      const { data: tx } = await admin
        .from("transactions")
        .select("amount")
        .eq("module_id", moduleId)
        .eq("type", "expense");
      const used = (tx ?? []).reduce((s, t) => s + Number(t.amount), 0);
      const pct = (used / Number(mod.budget)) * 100;
      if (pct >= 100) return `🎯 *${a.name}* — orçamento de ${mod.name} estourado (${pct.toFixed(0)}%).`;
      if (pct >= 90) return `⚠️ *${a.name}* — ${mod.name} em ${pct.toFixed(0)}% do orçamento.`;
      return null;
    }
    case "recurring_due": {
      // simples: avisa hoje se descrição contém termos
      const { data } = await admin
        .from("transactions")
        .select("description")
        .eq("household_id", a.household_id)
        .ilike("description", `%${String(a.config.term ?? "")}%`)
        .order("occurred_at", { ascending: false })
        .limit(1);
      if (!data?.length) return null;
      return `🔁 *${a.name}* — verifique recorrência de ${data[0]?.description}.`;
    }
    case "custom": {
      const msg = a.config.message as string | undefined;
      return msg ? `🔔 *${a.name}*\n${msg}` : null;
    }
    default:
      return null;
  }
}

async function notifyTargets(a: AlertRow, body: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("household_members")
    .select("whatsapp_phone")
    .in("id", a.target_member_ids ?? []);
  for (const m of data ?? []) {
    if (m.whatsapp_phone) {
      await sendWhatsAppText(m.whatsapp_phone, `${body}\n\n_${fmtDate(new Date())}_`);
    }
  }
}
