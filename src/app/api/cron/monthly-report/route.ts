import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NextResponse, type NextRequest } from "next/server";

import { previousMonthRange } from "@/lib/dates";
import { getServerEnv } from "@/lib/env";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramText } from "@/lib/telegram/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TxRow {
  amount: number | string;
  type: string;
  description: string | null;
  categories: { name: string } | null;
}

export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const auth = req.headers.get("authorization");
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== env.CRON_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false, reason: "telegram_not_configured" });
  }

  const admin = createSupabaseAdmin();
  const { start, end } = previousMonthRange();
  const startISO = format(start, "yyyy-MM-dd");
  const endISO = format(end, "yyyy-MM-dd");
  const monthLabel = format(start, "MMMM 'de' yyyy", { locale: ptBR });

  const { data: members } = await admin
    .from("household_members")
    .select("household_id, telegram_chat_id, households:households(name)")
    .not("telegram_chat_id", "is", null);

  let sent = 0;
  const seen = new Set<string>();

  for (const m of (members ?? []) as Array<{
    household_id: string;
    telegram_chat_id: number | null;
    households: { name: string } | null;
  }>) {
    if (!m.telegram_chat_id) continue;
    const dedupKey = `${m.household_id}:${m.telegram_chat_id}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const { data: txs } = await admin
      .from("transactions")
      .select("amount, type, description, categories:categories(name)")
      .eq("household_id", m.household_id)
      .gte("occurred_at", startISO)
      .lte("occurred_at", endISO);

    const rows = (txs ?? []) as TxRow[];
    if (rows.length === 0) continue;

    const message = buildMessage({
      householdName: m.households?.name ?? "Sua casa",
      monthLabel,
      rows,
    });

    try {
      await sendTelegramText(m.telegram_chat_id, message);
      sent += 1;
    } catch (err) {
      console.error("monthly-report send", m.telegram_chat_id, err);
    }
  }

  return NextResponse.json({ ok: true, month: monthLabel, sent });
}

function buildMessage(args: { householdName: string; monthLabel: string; rows: TxRow[] }): string {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();

  for (const r of args.rows) {
    const amount = Number(r.amount);
    if (!Number.isFinite(amount)) continue;
    if (r.type === "income") income += amount;
    if (r.type === "expense") {
      expense += amount;
      const cat = r.categories?.name ?? "Sem categoria";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + amount);
      const merchant = (r.description ?? "").trim() || "Sem descrição";
      byMerchant.set(merchant, (byMerchant.get(merchant) ?? 0) + amount);
    }
  }

  const topCats = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMerchants = [...byMerchant.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const balance = income - expense;

  const catLines = topCats
    .map(([name, value]) => {
      const pct = expense > 0 ? Math.round((value / expense) * 100) : 0;
      return `• ${escapeMd(name)}: ${formatBRL(value)} (${pct}%)`;
    })
    .join("\n");

  const merchLines = topMerchants.map(([name, value]) => `• ${escapeMd(name)}: ${formatBRL(value)}`).join("\n");

  return [
    `📊 *Resumo de ${args.monthLabel}*`,
    `_${escapeMd(args.householdName)}_`,
    "",
    `💚 Entradas: ${formatBRL(income)}`,
    `💸 Saídas: ${formatBRL(expense)}`,
    `${balance >= 0 ? "✅" : "⚠️"} Saldo: ${formatBRL(balance)}`,
    "",
    topCats.length ? "*Top categorias*\n" + catLines : "",
    topMerchants.length ? "\n*Maiores gastos*\n" + merchLines : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeMd(s: string): string {
  return s.replace(/([_*`\[\]])/g, "\\$1");
}
