import "server-only";

import { monthRangeISO, todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
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
    .select(
      "name, quantity, unit_price, actual_unit_price, status, supplier, bought_at, suppliers:suppliers(name)",
    )
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
  const amountOf = (r: ItemRow) =>
    Number(r.quantity) * Number(r.actual_unit_price ?? r.unit_price ?? 0);

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
    const recent = [...done]
      .sort((a, b) => (b.bought_at ?? "").localeCompare(a.bought_at ?? ""))
      .slice(0, 15);
    lines.push("", "## Últimos 15 custos registrados");
    for (const r of recent) {
      const supplierLabel = r.suppliers?.name || r.supplier || "—";
      lines.push(`- ${r.bought_at ?? "—"} ${formatBRL(amountOf(r))} ${r.name} (${supplierLabel})`);
    }
  }

  const today = todayISO();
  const { data: acts } = await admin
    .from("obra_activities")
    .select("title, due_date, assignee, status, recurrence")
    .eq("module_id", mod.id);
  const openActs = (acts ?? [])
    .filter((a) => a.status !== "feito")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const doneCount = (acts ?? []).length - openActs.length;
  lines.push("", `## Atividades abertas (${openActs.length}; já feitas: ${doneCount})`);
  if (openActs.length === 0) lines.push("- nenhuma");
  const who = (a: { assignee: string | null }) =>
    a.assignee ? ` | responsável: ${a.assignee}` : "";
  const groups: [string, typeof openActs][] = [
    [
      "Atrasadas (venceram antes de hoje)",
      openActs.filter((a) => a.due_date && a.due_date < today),
    ],
    ["Para hoje", openActs.filter((a) => a.due_date === today)],
    ["Próximas (ainda não venceram)", openActs.filter((a) => a.due_date && a.due_date > today)],
    ["Sem data", openActs.filter((a) => !a.due_date)],
  ];
  for (const [label, list] of groups) {
    if (list.length === 0) continue;
    lines.push(`${label}:`);
    for (const a of list.slice(0, 15))
      lines.push(
        `- ${a.title}${a.due_date ? ` | ${a.due_date}` : ""}${who(a)}${a.recurrence ? ` | repete: ${a.recurrence}` : ""}`,
      );
  }

  const [{ data: convs }, { data: supplierRows }] = await Promise.all([
    admin
      .from("wa_conversations")
      .select("contact_name, phone, supplier_id, last_message_at")
      .eq("household_id", opts.householdId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(25),
    admin.from("suppliers").select("id, name").eq("household_id", opts.householdId),
  ]);
  if ((convs ?? []).length > 0) {
    const sName = new Map((supplierRows ?? []).map((x) => [x.id, x.name]));
    lines.push("", "## Conversas do WhatsApp no app (use read_whatsapp_conversation pra ler)");
    for (const c of convs ?? []) {
      const who = (c.supplier_id && sName.get(c.supplier_id)) || c.contact_name || c.phone;
      const tag = c.supplier_id && sName.get(c.supplier_id) ? " (fornecedor)" : "";
      lines.push(
        `- ${who}${tag}${c.last_message_at ? ` | última mensagem ${c.last_message_at.slice(0, 10)}` : ""}`,
      );
    }
  }

  return lines.join("\n");
}

export const READ_CONVERSATION_TOOL = {
  name: "read_whatsapp_conversation",
  description:
    "Lê as mensagens de uma conversa do WhatsApp que está no app (lista em 'Conversas do WhatsApp no app'). " +
    "Use sempre que o usuário pedir algo com base numa conversa: 'o que o Daniel falou', 'na conversa com a Hidráulica', " +
    "'resume a conversa', 'lança o que ele cobrou'. Depois de ler, responda ou use as outras ferramentas (despesa, atividade...).",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description:
          "Nome do fornecedor ou contato da conversa, como aparece na lista (ou parte dele).",
      },
      limit: {
        type: "number",
        description: "Quantas mensagens recentes ler (padrão 80, máximo 200).",
      },
    },
    required: ["name"],
  },
};

const msgTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Mensagens de uma conversa do WhatsApp da obra, em texto, pra IA ler. */
export async function readConversation(
  householdId: string,
  args: { name?: string; limit?: number },
): Promise<string> {
  const admin = createSupabaseAdmin();
  const wanted = norm(args.name ?? "");
  if (!wanted) return "Diga de qual conversa (nome do fornecedor ou contato).";
  const [{ data: convs }, { data: supplierRows }] = await Promise.all([
    admin
      .from("wa_conversations")
      .select("id, contact_name, phone, supplier_id")
      .eq("household_id", householdId),
    admin.from("suppliers").select("id, name").eq("household_id", householdId),
  ]);
  const sName = new Map((supplierRows ?? []).map((x) => [x.id, x.name]));
  const titled = (convs ?? []).map((c) => ({
    ...c,
    title: (c.supplier_id && sName.get(c.supplier_id)) || c.contact_name || c.phone,
  }));
  const digits = wanted.replace(/\D/g, "");
  const exact = titled.filter((c) => norm(c.title) === wanted);
  const matches =
    exact.length > 0
      ? exact
      : titled.filter(
          (c) =>
            norm(c.title).includes(wanted) ||
            norm(c.contact_name ?? "").includes(wanted) ||
            (digits.length >= 4 && c.phone.includes(digits)),
        );
  if (matches.length === 0) {
    return `Não achei conversa com "${args.name}". Conversas no app: ${titled.map((c) => c.title).join(", ") || "nenhuma"}.`;
  }
  if (matches.length > 1)
    return `Mais de uma conversa bate com "${args.name}": ${matches.map((c) => c.title).join(", ")}. Pergunte qual.`;

  const conv = matches[0]!;
  const limit = Math.min(Math.max(Number(args.limit) || 80, 10), 200);
  const { data: msgs } = await admin
    .from("wa_messages")
    .select("direction, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (msgs ?? []).reverse();
  if (rows.length === 0) return `A conversa com ${conv.title} ainda não tem mensagens no app.`;
  return [
    `Conversa com ${conv.title}${conv.supplier_id ? " (fornecedor cadastrado)" : ""}, ${rows.length} mensagens mais recentes:`,
    ...rows.map(
      (m) =>
        `[${msgTime.format(new Date(m.created_at))}] ${m.direction === "out" ? "Você" : conv.title}: ${m.content}`,
    ),
  ].join("\n");
}

function norm(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const ASSISTANT_SYSTEM = `Você é o ON AI, assistente do app On Obra (controle de custos da obra).
Fala português brasileiro coloquial, direto, conciso. Sem floreios.

REGRAS:
- Esse app só registra CUSTOS da obra (executados ou planejados). Não existe receita/entrada.
- Pra perguntas sobre os números do usuário, use APENAS os dados do "FINANCIAL CONTEXT" ou o
  resultado da ferramenta search_costs. Não invente números.
- Se o usuário pedir um gasto específico (fornecedor, item, período) que não está
  no resumo do contexto, USE a ferramenta search_costs em vez de dizer que não sabe.
- REGISTRAR DESPESA/COTAÇÃO: use a ferramenta register_expense. Ela NÃO grava: ela monta o resumo
  que o app mostra com os botões Confirmar e Cancelar. Ou seja, chamar a ferramenta É o pedido de
  confirmação. Nunca peça confirmação em texto ("tá certo?", "confirma?"): chame a ferramenta.
- register_expense precisa de 4 dados: item, valor total, fornecedor e situação.
  - Situação, deduza do verbo SEM perguntar:
    EXECUTADA = paguei, gastei, comprei, foi, saiu, custou, acertei, quitei.
    COTACAO = cotou, orçou, orçamento, passou o preço, cotação, vai cobrar, quanto sai.
    Só pergunte "já foi pago ou é só cotação?" se não tiver nenhuma pista.
  - Fornecedor é obrigatório. Normalmente vem depois de "na", "no", "da", "do", "com", "pro" (ex: "na casa do
    construtor" = fornecedor Casa do Construtor). Só se não houver nenhum nome, pergunte "De qual fornecedor?". Pode ser um
    fornecedor novo; ele é cadastrado junto ao confirmar (não chame add_supplier antes).
  - Nunca pergunte quantidade, unidade, se o valor é unitário ou detalhes extras. O número que o
    usuário disser É o valor total.
  - Assim que tiver os 4 dados (somando o que veio em mensagens anteriores), CHAME a ferramenta
    na mesma resposta. Pergunte o que faltar numa frase só.
- Só fale em "resumo"/"confirmar" se você chamou uma ferramenta NESTA resposta. Nesse caso
  responda curto, tipo "Confere o resumo e confirma." Nunca diga que já registrou: quem grava é
  o botão Confirmar do app, nunca você. Se o usuário disser "sim"/"ok" e você não chamou ferramenta
  nesta conversa, pergunte o que ele quer registrar.
- Várias despesas na mesma mensagem: chame register_expense uma vez para cada uma, na mesma resposta.
- Se o usuário corrigir algo, chame a ferramenta de novo com os dados corrigidos.
- Exemplos:
  Usuário: "paguei 150 de cimento" -> você: "De qual fornecedor?"
  Usuário: "na leroy" -> você chama register_expense(item "Cimento", 150, "Leroy", executada).
  Usuário: "paguei 300 de areia na casa do construtor" -> chama register_expense(item "Areia", 300, "Casa do Construtor", executada).
  Usuário: "a leroy cotou a areia a 800" -> chama register_expense(item "Areia", 800, "Leroy", cotacao).
  Usuário: "quero fazer uma cotação de areia no depósito são josé" -> você: "Qual o valor?"
  Usuário: "registra 300 do eletricista" -> você: "Qual o nome do eletricista, e já foi pago ou é só cotação?"
- ATIVIDADES (tarefas com data e responsável):
  - Perguntas como "o que tem pra hoje?", "o que está atrasado?", "o que o Daniel tem pra fazer?":
    responda com a lista "Atividades abertas" do contexto.
  - Algo a FAZER ("anota", "lembrar de", "precisa", "tem que", "agenda", "marcar"): chame add_activity.
    Só o título é obrigatório. Data e responsável são opcionais: use se o usuário disser, resolvendo
    "amanhã", "sexta", "dia 15" a partir de Hoje. Não pergunte nada além disso; chame a ferramenta.
  - Terminou/fez/concluiu algo que está nas abertas: chame complete_activity com o título.
  - add_checklist_item é só pra lista de referência por fase. Tarefa com data ou responsável é atividade.
  - Exemplos:
    "anota pro Daniel concretar a laje sexta" -> add_activity(title "Concretar a laje", assignee "Daniel", due_date da próxima sexta).
    "preciso comprar tela de proteção" -> add_activity(title "Comprar tela de proteção").
    "o Daniel terminou a caixa de inspeção" -> complete_activity(title "caixa de inspeção").
    "toda segunda pedir água pro pessoal" -> add_activity(title "Pedir água", recurrence "semanal", due_date da próxima segunda).
  - Atividade com "repete" no contexto: ao concluir, a próxima é criada sozinha. Não crie outra igual.
- CONVERSAS DO WHATSAPP: quando o pedido depender do que foi falado com um fornecedor ou contato ("o que o Daniel
  disse", "resume a conversa com a Hidráulica", "lança o que ele cobrou", "cria as tarefas que combinamos"), chame
  read_whatsapp_conversation com o nome antes de responder. Depois use o que leu: responda, ou chame register_expense /
  add_activity / outras ferramentas com os dados da conversa (o usuário ainda confirma no cartão). Cite datas e valores
  como aparecem nas mensagens; se algo não estiver claro na conversa, pergunte.
  - Valor cobrado na conversa só é EXECUTADA se a conversa mostrar que já foi pago ("paguei", "fiz o pix",
    comprovante). Se ainda vai pagar ("pago segunda", "te passo amanhã") ou só foi cobrado, use cotacao e avise
    que dá pra executar/parcelar quando pagar.
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
    .select(
      "name, quantity, unit_price, actual_unit_price, supplier, bought_at, suppliers:suppliers(name)",
    )
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
      (r) =>
        r.name.toLowerCase().includes(term) ||
        (r.suppliers?.name ?? r.supplier ?? "").toLowerCase().includes(term),
    );
  }

  if (rows.length === 0) return "Nenhum custo encontrado com esses critérios.";

  const amountOf = (r: Row) =>
    Number(r.quantity) * Number(r.actual_unit_price ?? r.unit_price ?? 0);
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
      query: {
        type: "string",
        description:
          "Termo livre pra buscar no nome do item ou fornecedor (ex.: 'cimento', 'Leroy Merlin').",
      },
      date_from: {
        type: "string",
        description: "Data inicial ISO (YYYY-MM-DD), se o usuário mencionar período.",
      },
      date_to: {
        type: "string",
        description: "Data final ISO (YYYY-MM-DD), se o usuário mencionar período.",
      },
      status: {
        type: "string",
        enum: ["done", "todo"],
        description: "Padrão: done (já executado).",
      },
    },
  },
};
