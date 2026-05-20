import "server-only";

import { formatBRL } from "@/lib/money";
import { monthRangeISO } from "@/lib/dates";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface ContextOptions {
  householdId: string;
  /** Carrega top categorias do mês atual */
  includeCategories?: boolean;
  /** Carrega 20 transações mais recentes */
  includeTransactions?: boolean;
  /** Carrega módulos ativos com orçamento */
  includeModules?: boolean;
}

/**
 * Monta o "financial context" a injetar no system prompt da IA.
 * Texto curto e estruturado pra economizar tokens (usaremos Haiku).
 */
export async function buildFinancialContext(opts: ContextOptions): Promise<string> {
  const admin = createSupabaseAdmin();
  const { start, end } = monthRangeISO();
  const lines: string[] = [];

  // Resumo do mês
  const { data: monthTx } = await admin
    .from("transactions")
    .select("type, amount, category_id, categories:categories(name)")
    .eq("household_id", opts.householdId)
    .gte("occurred_at", start)
    .lte("occurred_at", end);

  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const tx of (monthTx ?? []) as Array<{ type: string; amount: number | string; categories: { name: string } | null }>) {
    const v = Number(tx.amount);
    if (tx.type === "income") income += v;
    if (tx.type === "expense") {
      expense += v;
      const name = (tx as unknown as { categories: { name: string } | null }).categories?.name ?? "Outros";
      byCategory.set(name, (byCategory.get(name) ?? 0) + v);
    }
  }

  lines.push(
    `## Resumo do mês atual (${start} a ${end})`,
    `- Entradas: ${formatBRL(income)}`,
    `- Saídas: ${formatBRL(expense)}`,
    `- Saldo: ${formatBRL(income - expense)}`,
    `- Taxa de poupança: ${income > 0 ? (((income - expense) / income) * 100).toFixed(1) : "0"}%`,
  );

  if (opts.includeCategories !== false) {
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length > 0) {
      lines.push("", "## Top categorias do mês");
      for (const [name, v] of top) lines.push(`- ${name}: ${formatBRL(v)}`);
    }
  }

  if (opts.includeTransactions !== false) {
    const { data: recent } = await admin
      .from("transactions")
      .select("type, amount, description, occurred_at, categories:categories(name), payment_methods:payment_methods(name)")
      .eq("household_id", opts.householdId)
      .order("occurred_at", { ascending: false })
      .limit(15);

    if ((recent ?? []).length > 0) {
      lines.push("", "## Últimas 15 transações");
      for (const r of recent ?? []) {
        const cat = (r as unknown as { categories: { name: string } | null }).categories?.name ?? "—";
        const pm = (r as unknown as { payment_methods: { name: string } | null }).payment_methods?.name ?? "—";
        const sign = r.type === "income" ? "+" : "-";
        lines.push(`- ${r.occurred_at} ${sign}${formatBRL(Number(r.amount))} ${r.description ?? cat} (${cat} · ${pm})`);
      }
    }
  }

  if (opts.includeModules !== false) {
    const { data: mods } = await admin
      .from("modules")
      .select("id, kind, name, budget, status")
      .eq("household_id", opts.householdId)
      .in("status", ["planning", "active"]);
    if ((mods ?? []).length > 0) {
      // Soma realizado por módulo
      const ids = (mods ?? []).map((m) => m.id);
      const { data: modTx } = await admin
        .from("transactions")
        .select("module_id, amount")
        .in("module_id", ids)
        .eq("type", "expense");
      const used = new Map<string, number>();
      for (const t of modTx ?? []) {
        if (t.module_id) used.set(t.module_id, (used.get(t.module_id) ?? 0) + Number(t.amount));
      }
      lines.push("", "## Módulos ativos");
      for (const m of mods ?? []) {
        const u = used.get(m.id) ?? 0;
        const b = Number(m.budget ?? 0);
        const pct = b > 0 ? ((u / b) * 100).toFixed(0) : "—";
        lines.push(`- [${m.kind}] ${m.name}: usado ${formatBRL(u)} de ${formatBRL(b)} (${pct}%)`);
      }
    }
  }

  return lines.join("\n");
}

export const ASSISTANT_SYSTEM = `Você é o ON AI, assistente do app ON WAY FINANCIAL.
Fala português brasileiro coloquial, direto, conciso. Sem floreios.

REGRAS:
- Pra perguntas sobre os números do usuário, use APENAS os dados do "FINANCIAL CONTEXT". Não invente números.
- Pra perguntas gerais (conceitos, comparações, produtos do mercado), use seu conhecimento.
- Se faltar dado, peça pro usuário especificar.
- Sugira ações claras e curtas, em bullet points quando ajudar.
- Quando citar valores em reais, use R$ X,XX (Intl pt-BR).
- Máximo ~6 frases por resposta, exceto quando o usuário pedir detalhe.
- Não repita o contexto na resposta — ele já viu.
- NUNCA use markdown: nada de ** _ \`\` # ou tabelas. Escreva texto puro. Pra ênfase use MAIÚSCULAS curtas. Pra listas, use "- " no início da linha.`;
