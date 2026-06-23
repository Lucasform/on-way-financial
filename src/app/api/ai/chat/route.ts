import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { getServerEnv } from "@/lib/env";
import { brl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const env = getServerEnv();
  if (!env.anthropicKey) return NextResponse.json({ error: "ai_off" }, { status: 503 });

  const ctx = await loadActiveContext();
  if (!ctx?.householdId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { messages } = await req.json().catch(() => ({ messages: [] }));
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const supabase = createClient();
  const hid = ctx.householdId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: mtx }, { data: accs }, { data: mods }, { data: goals }] = await Promise.all([
    supabase.from("transactions").select("type, amount, categories(name)").eq("household_id", hid).gte("occurred_on", monthStart),
    supabase.from("accounts").select("name, type, opening_balance").eq("household_id", hid).eq("archived", false),
    supabase.from("modules").select("name, kind, budget").eq("household_id", hid).neq("status", "archived"),
    supabase.from("goals").select("name, target_amount, saved_amount").eq("household_id", hid),
  ]);

  const rows = mtx ?? [];
  const inc = rows.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const exp = rows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const byCat = new Map<string, number>();
  rows.filter((t) => t.type === "expense").forEach((t) => {
    const n = (t.categories as any)?.name ?? "Outros";
    byCat.set(n, (byCat.get(n) ?? 0) + Number(t.amount));
  });
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => `${n}: ${brl(v)}`).join(", ");

  const snapshot = `Snapshot financeiro do usuário (mês atual ${now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}):
- Entradas: ${brl(inc)} | Saídas: ${brl(exp)} | Saldo: ${brl(inc - exp)}
- Top categorias de gasto: ${topCats || "nenhuma"}
- Contas: ${(accs ?? []).map((a) => `${a.name} (${a.type})`).join(", ") || "nenhuma"}
- Módulos: ${(mods ?? []).map((m) => `${m.name} [${m.kind}] orçamento ${brl(Number(m.budget))}`).join("; ") || "nenhum"}
- Metas: ${(goals ?? []).map((g) => `${g.name} ${brl(Number(g.saved_amount))}/${brl(Number(g.target_amount))}`).join("; ") || "nenhuma"}`;

  const client = new Anthropic({ apiKey: env.anthropicKey });
  const res = await client.messages.create({
    model: env.aiParseModel,
    max_tokens: 700,
    system: `Você é o assistente financeiro do app On Way Financial. Responda em português do Brasil,
de forma curta, direta e prática, sobre as finanças do usuário usando o snapshot abaixo.
Pode dar dicas de economia e organização. Não invente números fora do snapshot; se faltar dado, diga o que registrar.
Sem travessões no meio da frase.

${snapshot}`,
    messages: messages.slice(-10).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000),
    })),
  });

  const text = res.content.filter((c) => c.type === "text").map((c: any) => c.text).join("\n");
  return NextResponse.json({ reply: text || "Não consegui responder agora." });
}
