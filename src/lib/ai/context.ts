import "server-only";

import { formatBRL } from "@/lib/money";
import { monthRangeISO } from "@/lib/dates";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface ContextOptions {
  householdId: string;
  /** Carrega gasto por fornecedor */
  includeCategories?: boolean;
  /** Carrega últimos custos registrados */
  includeTransactions?: boolean;
}

/**
 * Monta o "financial context" a injetar no system prompt da IA.
 * Texto curto e estruturado pra economizar tokens (usaremos Haiku).
 */
export async function buildFinancialContext(opts: ContextOptions): Promise<string> {
  const admin = createSupabaseAdmin();
  const { start, end } = monthRangeISO();
  const lines: string[] = [];

  const { data: mod } = await admin
    .from("modules")
    .select("id, name")
    .eq("household_id", opts.householdId)
    .eq("kind", "obra")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!mod) {
    lines.push("Nenhuma obra cadastrada ainda.");
    return lines.join("\n");
  }

  const { data: items } = await admin
    .from("obra_items")
    .select("name, quantity, unit_price, actual_unit_price, status, supplier, bought_at, suppliers:suppliers(name)")
    .eq("module_id", mod.id);

  type ItemRow = {
    name: string;
    quantity: number | string;
    unit_price: number | string | null;
    actual_unit_price: number | string | null;
    status: string;
    supplier: string | null;
    bought_at: string | null;
    suppliers: { name: string } | null;
  };
  const rows = (items ?? []) as unknown as ItemRow[];
  const amountOf = (r: ItemRow) => Number(r.quantity) * Number(r.actual_unit_price ?? r.unit_price ?? 0);

  const done = rows.filter((r) => r.status === "done");
  const todo = rows.filter((r) => r.status === "todo");
  const monthDone = done.filter((r) => r.bought_at && r.bought_at >= start && r.bought_at <= end);

  const totalGasto = done.reduce((s, r) => s + amountOf(r), 0);
  const totalMes = monthDone.reduce((s, r) => s + amountOf(r), 0);
  const totalPendente = todo.reduce((s, r) => s + amountOf(r), 0);

  lines.push(
    `## Obra: ${mod.name}`,
    `- Gasto total até agora (custos já executados): ${formatBRL(totalGasto)}`,
    `- Gasto no mês atual (${start} a ${end}): ${formatBRL(totalMes)}`,
    `- Pendente (itens planejados, ainda não executados): ${formatBRL(totalPendente)} em ${todo.length} item(ns)`,
  );

  if (opts.includeCategories !== false) {
    const bySupplier = new Map<string, number>();
    for (const r of done) {
      const label = r.suppliers?.name || r.supplier || "Sem fornecedor";
      bySupplier.set(label, (bySupplier.get(label) ?? 0) + amountOf(r));
    }
    const top = [...bySupplier.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length > 0) {
      lines.push("", "## Gasto por fornecedor");
      for (const [name, v] of top) lines.push(`- ${name}: ${formatBRL(v)}`);
    }
  }

  if (opts.includeTransactions !== false && done.length > 0) {
    const recent = [...done].sort((a, b) => (b.bought_at ?? "").localeCompare(a.bought_at ?? "")).slice(0, 15);
    lines.push("", "## Últimos 15 custos registrados");
    for (const r of recent) {
      const supplierLabel = r.suppliers?.name || r.supplier || "—";
      lines.push(`- ${r.bought_at ?? "—"} ${formatBRL(amountOf(r))} ${r.name} (${supplierLabel})`);
    }
  }

  return lines.join("\n");
}

export const ASSISTANT_SYSTEM = `Você é o ON AI, assistente do app On Obra (controle de custos da obra).
Fala português brasileiro coloquial, direto, conciso. Sem floreios.

REGRAS:
- Esse app só registra CUSTOS da obra (executados ou planejados). Não existe receita/entrada.
- Pra perguntas sobre os números do usuário, use APENAS os dados do "FINANCIAL CONTEXT" ou o
  resultado da ferramenta search_costs. Não invente números.
- Se o usuário pedir um gasto específico (fornecedor, item, período) que não está
  no resumo do contexto, USE a ferramenta search_costs em vez de dizer que não sabe.
- Você NUNCA grava nada sozinho. register_expense, add_supplier e add_checklist_item só PREPARAM
  uma proposta; o app mostra um cartão com o resumo e os botões Confirmar e Cancelar, e só grava
  quando o usuário confirmar.
- Despesa segue sempre o fluxo da tela Adicionar despesa, nesta ordem:
  1) o que foi e o valor total;
  2) o FORNECEDOR (obrigatório; se o usuário não disse, pergunte qual foi);
  3) a situação: COTAÇÃO (só um preço que passaram, ainda não gasto) ou EXECUTADA (já pago/feito).
     Se não estiver claro, pergunte "já foi pago ou é só cotação?".
  Só chame register_expense quando tiver os quatro dados. Pergunte o que faltar numa frase só.
- Fornecedor que ainda não existe é cadastrado junto na confirmação; não precisa chamar add_supplier antes.
- Depois de chamar uma ferramenta de proposta, responda numa frase curta pedindo pra conferir o
  cartão e confirmar. Não diga que já registrou.
- Se o usuário corrigir algo, chame a ferramenta de novo com os dados corrigidos.
- Pra perguntas gerais (conceitos, comparações, produtos do mercado), use seu conhecimento.
- Se faltar dado, peça pro usuário especificar.
- Sugira ações claras e curtas, em bullet points quando ajudar.
- Quando citar valores em reais, use R$ X,XX (Intl pt-BR).
- Máximo ~6 frases por resposta, exceto quando o usuário pedir detalhe.
- Não repita o contexto na resposta — ele já viu.
- NUNCA use markdown: nada de ** _ \`\` # ou tabelas. Escreva texto puro. Pra ênfase use MAIÚSCULAS curtas. Pra listas, use "- " no início da linha.`;

export interface SearchCostsArgs {
  query?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  status?: "done" | "todo" | null;
}

/**
 * Busca custos da obra por critério livre (item/fornecedor) e período. Usada pela IA como
 * ferramenta (tool use) quando o usuário pede um gasto específico que não está no resumo fixo
 * do contexto.
 */
export async function searchCosts(householdId: string, args: SearchCostsArgs): Promise<string> {
  const admin = createSupabaseAdmin();
  const { data: mod } = await admin
    .from("modules")
    .select("id")
    .eq("household_id", householdId)
    .eq("kind", "obra")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!mod) return "Não encontrei a obra ativa.";

  let q = admin
    .from("obra_items")
    .select("name, quantity, unit_price, actual_unit_price, supplier, bought_at, suppliers:suppliers(name)")
    .eq("module_id", mod.id)
    .eq("status", args.status ?? "done")
    .order("bought_at", { ascending: false })
    .limit(50);

  if (args.date_from) q = q.gte("bought_at", args.date_from);
  if (args.date_to) q = q.lte("bought_at", args.date_to);

  const { data, error } = await q;
  if (error) return `Erro ao buscar: ${error.message}`;

  type Row = {
    name: string;
    quantity: number | string;
    unit_price: number | string | null;
    actual_unit_price: number | string | null;
    supplier: string | null;
    bought_at: string | null;
    suppliers: { name: string } | null;
  };
  let rows = (data ?? []) as unknown as Row[];

  if (args.query?.trim()) {
    const term = args.query.trim().toLowerCase();
    rows = rows.filter(
      (r) => r.name.toLowerCase().includes(term) || (r.suppliers?.name ?? r.supplier ?? "").toLowerCase().includes(term),
    );
  }

  if (rows.length === 0) return "Nenhum custo encontrado com esses critérios.";

  const amountOf = (r: Row) => Number(r.quantity) * Number(r.actual_unit_price ?? r.unit_price ?? 0);
  const total = rows.reduce((s, r) => s + amountOf(r), 0);
  const lines = [`${rows.length} custo(s), total ${formatBRL(total)}:`];
  for (const r of rows.slice(0, 30)) {
    const supplierLabel = r.suppliers?.name || r.supplier || "—";
    lines.push(`- ${r.bought_at ?? "—"} ${formatBRL(amountOf(r))} ${r.name} (${supplierLabel})`);
  }
  if (rows.length > 30) lines.push(`... e mais ${rows.length - 30} custo(s).`);
  return lines.join("\n");
}

export const SEARCH_COSTS_TOOL = {
  name: "search_costs",
  description:
    "Busca custos da obra (executados ou planejados) por item, fornecedor ou período. Use sempre " +
    "que o usuário perguntar por um gasto específico que não está no resumo do contexto (ex.: " +
    '"quanto gastei com cimento", "o que comprei da Leroy Merlin", "gastos de julho").',
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "Termo livre pra buscar no nome do item ou fornecedor (ex.: 'cimento', 'Leroy Merlin')." },
      date_from: { type: "string", description: "Data inicial ISO (YYYY-MM-DD), se o usuário mencionar período." },
      date_to: { type: "string", description: "Data final ISO (YYYY-MM-DD), se o usuário mencionar período." },
      status: { type: "string", enum: ["done", "todo"], description: "Padrão: done (já executado)." },
    },
  },
};
