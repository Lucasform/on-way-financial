import { NextResponse, type NextRequest } from "next/server";

import { fmtDate, todayISO } from "@/lib/dates";
import { emailLayout, escapeHtml, sendResendEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env";
import { addDaysISO } from "@/lib/installments";
import { formatBRL } from "@/lib/money";
import { sendPushToUsers } from "@/lib/push";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OVERDUE_WINDOW_DAYS = 60;

type PaymentRow = {
  household_id: string;
  label: string;
  amount: number;
  due_date: string;
  price_quotes: { item_name: string; suppliers: { name: string } | null } | null;
};

type ActivityRow = {
  title: string;
  due_date: string;
  assignee: string | null;
  modules: { household_id: string } | null;
};

const LI = "margin:0 0 6px";
const UL = "margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.5;color:#d4d4d4";
const H = "margin:0 0 8px;font-size:14px;font-weight:600;color:#fff";

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const auth = req.headers.get("authorization");
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== env.CRON_SECRET) return new NextResponse("unauthorized", { status: 401 });

  const admin = createSupabaseAdmin();
  const today = todayISO();
  const since = addDaysISO(today, -OVERDUE_WINDOW_DAYS);

  const [payRes, actRes] = await Promise.all([
    admin
      .from("quote_payments")
      .select("household_id, label, amount, due_date, price_quotes(item_name, suppliers(name))")
      .is("paid_at", null)
      .lte("due_date", today)
      .gte("due_date", since)
      .order("due_date", { ascending: true }),
    admin
      .from("obra_activities")
      .select("title, due_date, assignee, modules!inner(household_id)")
      .neq("status", "feito")
      .lte("due_date", today)
      .gte("due_date", since)
      .order("due_date", { ascending: true }),
  ]);
  if (payRes.error || actRes.error) {
    console.error("payment-reminders query", payRes.error ?? actRes.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const byHousehold = new Map<string, { payments: PaymentRow[]; activities: ActivityRow[] }>();
  const bucket = (id: string) => {
    let b = byHousehold.get(id);
    if (!b) byHousehold.set(id, (b = { payments: [], activities: [] }));
    return b;
  };
  for (const r of (payRes.data ?? []) as unknown as PaymentRow[]) bucket(r.household_id).payments.push(r);
  for (const a of (actRes.data ?? []) as unknown as ActivityRow[]) {
    if (a.modules?.household_id) bucket(a.modules.household_id).activities.push(a);
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const appName = env.NEXT_PUBLIC_APP_NAME ?? "On Obra";
  let sent = 0;
  let failed = 0;
  let pushSent = 0;
  let pushFailed = 0;

  for (const [householdId, { payments, activities }] of byHousehold) {
    const { data: members } = await admin
      .from("household_members")
      .select("user_id, role")
      .eq("household_id", householdId);

    const payToday = payments.filter((r) => r.due_date === today);
    const payLate = payments.filter((r) => r.due_date < today);
    const actToday = activities.filter((a) => a.due_date === today);
    const actLate = activities.filter((a) => a.due_date < today);
    const total = payments.reduce((s, r) => s + Number(r.amount), 0);

    const parts = [
      payToday.length && `${plural(payToday.length, "pagamento", "pagamentos")} hoje`,
      payLate.length && `${plural(payLate.length, "pagamento atrasado", "pagamentos atrasados")}`,
      actToday.length && `${plural(actToday.length, "atividade", "atividades")} pra hoje`,
      actLate.length && `${plural(actLate.length, "atividade atrasada", "atividades atrasadas")}`,
    ].filter(Boolean) as string[];
    const summary = parts.join(", ");

    const push = await sendPushToUsers(
      (members ?? []).map((m) => m.user_id),
      {
        title: "Hoje na obra",
        body: payments.length > 0 ? `${summary}. Pagamentos somam ${formatBRL(total)}.` : `${summary}.`,
        url: "/overview",
        tag: `daily-${today}`,
      },
    );
    pushSent += push.sent;
    pushFailed += push.failed;

    const emails: string[] = [];
    for (const m of (members ?? []).filter((m) => m.role === "owner" || m.role === "admin")) {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      if (u.user?.email) emails.push(u.user.email);
    }
    if (emails.length === 0) continue;

    const payLine = (r: PaymentRow) => {
      const what = `${r.price_quotes?.item_name ?? "Pagamento"}${r.price_quotes?.suppliers?.name ? ` · ${r.price_quotes.suppliers.name}` : ""} (${r.label})`;
      const when = r.due_date === today ? "hoje" : `venceu ${fmtDate(r.due_date, "dd/MM")}`;
      return `<li style="${LI}">${escapeHtml(what)}: <strong style="color:#fff">${escapeHtml(formatBRL(Number(r.amount)))}</strong> <span style="color:#a3a3a3">${escapeHtml(when)}</span></li>`;
    };
    const actLine = (a: ActivityRow) => {
      const what = `${a.title}${a.assignee ? ` · ${a.assignee}` : ""}`;
      const when = a.due_date === today ? "hoje" : `atrasada desde ${fmtDate(a.due_date, "dd/MM")}`;
      return `<li style="${LI}">${escapeHtml(what)} <span style="color:#a3a3a3">${escapeHtml(when)}</span></li>`;
    };

    const bodyHtml =
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#d4d4d4">${escapeHtml(summary)}.</p>` +
      (payments.length > 0
        ? `<p style="${H}">Pagamentos (${escapeHtml(formatBRL(total))})</p><ul style="${UL}">${payments.map(payLine).join("")}</ul>`
        : "") +
      (activities.length > 0 ? `<p style="${H}">Atividades</p><ul style="${UL}">${activities.map(actLine).join("")}</ul>` : "");
    const html = emailLayout({
      appName,
      title: "Hoje na obra",
      bodyHtml,
      ctaLabel: "Abrir o app",
      ctaUrl: `${appUrl}/overview`,
      footer: "Quando pagar ou concluir, marque no app que o aviso para.",
    });
    const text = [
      `Hoje na obra: ${summary}.`,
      payments.length > 0 &&
        `Pagamentos:\n${payments
          .map((r) => `- ${r.price_quotes?.item_name ?? "Pagamento"} (${r.label}): ${formatBRL(Number(r.amount))}, ${r.due_date === today ? "hoje" : `venceu ${fmtDate(r.due_date, "dd/MM")}`}`)
          .join("\n")}`,
      activities.length > 0 &&
        `Atividades:\n${activities
          .map((a) => `- ${a.title}${a.assignee ? ` (${a.assignee})` : ""}, ${a.due_date === today ? "hoje" : `atrasada desde ${fmtDate(a.due_date, "dd/MM")}`}`)
          .join("\n")}`,
      `${appUrl}/overview`,
    ]
      .filter(Boolean)
      .join("\n\n");

    for (const to of emails) {
      const r = await sendResendEmail({ to, subject: `Hoje na obra: ${summary}`, html, text });
      if (r.ok) sent++;
      else {
        failed++;
        console.error("payment-reminders send", r.error);
      }
    }
  }

  return NextResponse.json({ ok: true, households: byHousehold.size, sent, failed, pushSent, pushFailed });
}
