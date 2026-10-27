import { NextResponse, type NextRequest } from "next/server";

import { fmtDate, todayISO } from "@/lib/dates";
import { emailLayout, escapeHtml, sendResendEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env";
import { addDaysISO } from "@/lib/installments";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OVERDUE_WINDOW_DAYS = 60;

type Row = {
  household_id: string;
  label: string;
  amount: number;
  due_date: string;
  price_quotes: { item_name: string; suppliers: { name: string } | null } | null;
};

export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const auth = req.headers.get("authorization");
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== env.CRON_SECRET) return new NextResponse("unauthorized", { status: 401 });

  const admin = createSupabaseAdmin();
  const today = todayISO();

  const { data, error } = await admin
    .from("quote_payments")
    .select("household_id, label, amount, due_date, price_quotes(item_name, suppliers(name))")
    .is("paid_at", null)
    .lte("due_date", today)
    .gte("due_date", addDaysISO(today, -OVERDUE_WINDOW_DAYS))
    .order("due_date", { ascending: true });
  if (error) {
    console.error("payment-reminders query", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const byHousehold = new Map<string, Row[]>();
  for (const r of (data ?? []) as unknown as Row[]) {
    byHousehold.set(r.household_id, [...(byHousehold.get(r.household_id) ?? []), r]);
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  let sent = 0;
  let failed = 0;

  for (const [householdId, rows] of byHousehold) {
    const { data: members } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId)
      .in("role", ["owner", "admin"]);

    const emails: string[] = [];
    for (const m of members ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      if (u.user?.email) emails.push(u.user.email);
    }
    if (emails.length === 0) continue;

    const dueToday = rows.filter((r) => r.due_date === today);
    const overdue = rows.filter((r) => r.due_date < today);
    const line = (r: Row) => {
      const what = `${r.price_quotes?.item_name ?? "Pagamento"}${r.price_quotes?.suppliers?.name ? ` · ${r.price_quotes.suppliers.name}` : ""} (${r.label})`;
      const when = r.due_date === today ? "hoje" : `venceu ${fmtDate(r.due_date, "dd/MM")}`;
      return `<li style="margin:0 0 6px">${escapeHtml(what)}: <strong style="color:#fff">${escapeHtml(formatBRL(Number(r.amount)))}</strong> <span style="color:#a3a3a3">${escapeHtml(when)}</span></li>`;
    };
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    const parts = [
      dueToday.length && `${dueToday.length} vence${dueToday.length > 1 ? "m" : ""} hoje`,
      overdue.length && `${overdue.length} atrasado${overdue.length > 1 ? "s" : ""}`,
    ].filter(Boolean);

    const bodyHtml =
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#d4d4d4">${escapeHtml(parts.join(" e "))}, somando ${escapeHtml(formatBRL(total))}.</p>` +
      `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5;color:#d4d4d4">${rows.map(line).join("")}</ul>`;
    const html = emailLayout({
      appName: env.NEXT_PUBLIC_APP_NAME ?? "On Obra",
      title: "Pagamentos da obra",
      bodyHtml,
      ctaLabel: "Ver pagamentos",
      ctaUrl: `${appUrl}/overview/cotacoes?tab=execucao`,
      footer: "Quando pagar, marque como pago no app que o aviso para.",
    });
    const text = `Pagamentos da obra: ${parts.join(" e ")}.\n\n${rows
      .map((r) => `- ${r.price_quotes?.item_name ?? "Pagamento"} (${r.label}): ${formatBRL(Number(r.amount))}, ${r.due_date === today ? "hoje" : `venceu ${fmtDate(r.due_date, "dd/MM")}`}`)
      .join("\n")}\n\n${appUrl}/overview/cotacoes?tab=execucao`;

    for (const to of emails) {
      const r = await sendResendEmail({ to, subject: `Pagamentos da obra: ${parts.join(" e ")}`, html, text });
      if (r.ok) sent++;
      else {
        failed++;
        console.error("payment-reminders send", r.error);
      }
    }
  }

  return NextResponse.json({ ok: true, households: byHousehold.size, sent, failed });
}
