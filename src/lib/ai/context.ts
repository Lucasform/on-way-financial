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

export const ASSISTANT_SYSTEM = `Você é o ON AI, assistente do app ON FIN (finanças da obra).
Fala português brasileiro coloquial, direto, conciso. Sem floreios.

REGRAS:
- Pra perguntas sobre os números do usuário, use APENAS os dados do "FINANCIAL CONTEXT" ou o
  resultado da ferramenta search_transactions. Não invente números.
- Se o usuário pedir um gasto específico (fornecedor, material, categoria, período) que não está
  no resumo do contexto, USE a ferramenta search_transactions em vez de dizer que não sabe.
- Se o usuário pedir pra cadastrar/adicionar um fornecedor (nome, telefone, CNPJ, endereço, tipo),
  USE a ferramenta add_supplier. Peça só o nome se faltar; o resto é opcional.
- Pra perguntas gerais (conceitos, comparações, produtos do mercado), use seu conhecimento.
- Se faltar dado, peça pro usuário especificar.
- Sugira ações claras e curtas, em bullet points quando ajudar.
- Quando citar valores em reais, use R$ X,XX (Intl pt-BR).
- Máximo ~6 frases por resposta, exceto quando o usuário pedir detalhe.
- Não repita o contexto na resposta — ele já viu.
- NUNCA use markdown: nada de ** _ \`\` # ou tabelas. Escreva texto puro. Pra ênfase use MAIÚSCULAS curtas. Pra listas, use "- " no início da linha.`;

export interface SearchTransactionsArgs {
  query?: string | null;
  category?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  type?: "expense" | "income" | null;
}

/**
 * Busca transações por critério livre (fornecedor/descrição/notas, categoria, período). Usada
 * pela IA como ferramenta (tool use) quando o usuário pede um gasto específico que não está no
 * resumo fixo do contexto.
 */
export async function searchTransactions(
  householdId: string,
  args: SearchTransactionsArgs,
): Promise<string> {
  const admin = createSupabaseAdmin();
  let q = admin
    .from("transactions")
    .select("amount, description, supplier, occurred_at, categories:categories(name)")
    .eq("household_id", householdId)
    .eq("type", args.type ?? "expense")
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (args.date_from) q = q.gte("occurred_at", args.date_from);
  if (args.date_to) q = q.lte("occurred_at", args.date_to);
  if (args.query?.trim()) {
    const term = args.query.trim();
    q = q.or(`description.ilike.%${term}%,supplier.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) return `Erro ao buscar: ${error.message}`;

  let rows = (data ?? []) as Array<{
    amount: number | string;
    description: string | null;
    supplier: string | null;
    occurred_at: string;
    categories: { name: string } | null;
  }>;

  if (args.category?.trim()) {
    const cat = args.category.trim().toLowerCase();
    rows = rows.filter((r) => (r.categories?.name ?? "").toLowerCase().includes(cat));
  }

  if (rows.length === 0) return "Nenhuma transação encontrada com esses critérios.";

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const lines = [`${rows.length} transação(ões), total ${formatBRL(total)}:`];
  for (const r of rows.slice(0, 30)) {
    const desc = r.description || r.supplier || r.categories?.name || "sem descrição";
    lines.push(`- ${r.occurred_at} ${formatBRL(Number(r.amount))} ${desc}${r.supplier ? ` (${r.supplier})` : ""}`);
  }
  if (rows.length > 30) lines.push(`... e mais ${rows.length - 30} transação(ões).`);
  return lines.join("\n");
}

export interface AddSupplierArgs {
  name: string;
  category?: string | null;
  phone?: string | null;
  phone2?: string | null;
  cnpj?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * Cadastra um fornecedor via IA (tool use). Usada quando o usuário pede pra adicionar/cadastrar
 * um fornecedor direto no chat, com qualquer combinação de telefone/CNPJ/endereço/tipo.
 */
export async function addSupplier(householdId: string, args: AddSupplierArgs): Promise<string> {
  if (!args.name?.trim()) return "Preciso pelo menos do nome do fornecedor.";
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("suppliers")
    .insert({
      household_id: householdId,
      name: args.name.trim(),
      category: args.category ?? "material",
      phone: args.phone ?? null,
      phone2: args.phone2 ?? null,
      cnpj: args.cnpj ?? null,
      address: args.address ?? null,
      notes: args.notes ?? null,
    })
    .select("id, name")
    .single();
  if (error || !data) return `Erro ao cadastrar: ${error?.message ?? "falha desconhecida"}.`;
  return `Fornecedor "${data.name}" cadastrado com sucesso.`;
}

export const ADD_SUPPLIER_TOOL = {
  name: "add_supplier",
  description:
    "Cadastra um novo fornecedor da obra (loja, prestador de serviço, mão de obra). Use quando o " +
    'usuário pedir pra "adicionar", "cadastrar" ou "salvar" um fornecedor, com qualquer combinação ' +
    "de telefone, CNPJ, endereço, tipo e notas.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Nome do fornecedor (obrigatório)." },
      category: { type: "string", enum: ["material", "mão-de-obra", "equipamento", "serviço", "outro"], description: "Padrão: material." },
      phone: { type: "string", description: "Telefone principal, se mencionado." },
      phone2: { type: "string", description: "Segundo telefone, se mencionado." },
      cnpj: { type: "string", description: "CNPJ, se mencionado." },
      address: { type: "string", description: "Endereço, se mencionado." },
      notes: { type: "string", description: "Observações livres, se houver." },
    },
    required: ["name"],
  },
};

export const SEARCH_TRANSACTIONS_TOOL = {
  name: "search_transactions",
  description:
    "Busca despesas/receitas da obra por fornecedor, descrição, categoria ou período. Use sempre " +
    "que o usuário perguntar por um gasto específico que não está no resumo do contexto (ex.: " +
    '"quanto gastei com cimento", "o que comprei da Leroy Merlin", "gastos de mão de obra em julho").',
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "Termo livre pra buscar em descrição/fornecedor/notas (ex.: 'cimento', 'Leroy Merlin')." },
      category: { type: "string", description: "Nome (ou parte) da categoria (ex.: 'Material', 'Mão de obra')." },
      date_from: { type: "string", description: "Data inicial ISO (YYYY-MM-DD), se o usuário mencionar período." },
      date_to: { type: "string", description: "Data final ISO (YYYY-MM-DD), se o usuário mencionar período." },
      type: { type: "string", enum: ["expense", "income"], description: "Padrão: expense." },
    },
  },
};
