/**
 * Dados fictícios para o modo /preview — não usa banco.
 * Gera ~35 transações realistas no mês atual + 12 meses pra trás.
 */
import { format, subDays, subMonths } from "date-fns";

export interface PreviewTx {
  id: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  description: string;
  occurred_at: string;
  source: "web" | "telegram" | "whatsapp";
  installment_number: number | null;
  installments_total: number | null;
  categories: { name: string; color: string; icon: string };
  payment_methods: { name: string; kind: string };
}

const today = new Date();

const cats = {
  market: { name: "Mercado", color: "#22C55E", icon: "shopping-cart" },
  food: { name: "Alimentação", color: "#F59E0B", icon: "utensils-crossed" },
  transport: { name: "Transporte", color: "#3B82F6", icon: "car" },
  home: { name: "Moradia", color: "#8B5CF6", icon: "home" },
  health: { name: "Saúde", color: "#EF4444", icon: "heart-pulse" },
  leisure: { name: "Lazer", color: "#EC4899", icon: "party-popper" },
  edu: { name: "Educação", color: "#6366F1", icon: "graduation-cap" },
  subs: { name: "Assinaturas", color: "#0EA5E9", icon: "repeat" },
  pets: { name: "Pets", color: "#14B8A6", icon: "paw-print" },
  salary: { name: "Salário", color: "#22C55E", icon: "wallet" },
  invest: { name: "Investimentos", color: "#00D1A0", icon: "trending-up" },
};

const pm = {
  pix: { name: "PIX Bradesco", kind: "pix" },
  cash: { name: "Dinheiro", kind: "cash" },
  credit: { name: "Nubank Roxinho", kind: "credit_card" },
  debit: { name: "Itaú Débito", kind: "debit_card" },
  vr: { name: "VR Alelo", kind: "meal_voucher" },
};

let _idCounter = 1;
const nextId = () => `tx-${_idCounter++}`;

function tx(
  type: PreviewTx["type"],
  amount: number,
  description: string,
  daysAgo: number,
  category: keyof typeof cats,
  payment: keyof typeof pm,
  opts: Partial<Pick<PreviewTx, "source" | "installment_number" | "installments_total">> = {},
): PreviewTx {
  return {
    id: nextId(),
    type,
    amount,
    description,
    occurred_at: format(subDays(today, daysAgo), "yyyy-MM-dd"),
    source: opts.source ?? "web",
    installment_number: opts.installment_number ?? null,
    installments_total: opts.installments_total ?? null,
    categories: cats[category],
    payment_methods: pm[payment],
  };
}

export const PREVIEW_TRANSACTIONS: PreviewTx[] = [
  // Salário
  tx("income", 8500, "Salário Maio", 5, "salary", "pix"),
  tx("income", 1200, "Freela design", 12, "salary", "pix"),

  // Hoje
  tx("expense", 28.5, "Café com Maria", 0, "food", "pix", { source: "telegram" }),
  tx("expense", 156.4, "Supermercado Pão de Açúcar", 0, "market", "credit"),

  // Ontem
  tx("expense", 42.0, "Uber pro trabalho", 1, "transport", "credit"),
  tx("expense", 18.9, "Padaria", 1, "food", "cash", { source: "telegram" }),
  tx("expense", 89.9, "Farmácia", 1, "health", "debit"),

  // 2-3 dias atrás
  tx("expense", 320.0, "Mercado mensal", 2, "market", "credit"),
  tx("expense", 55.0, "Posto Shell", 2, "transport", "credit"),
  tx("expense", 39.9, "Netflix", 3, "subs", "credit"),
  tx("expense", 19.9, "Spotify Premium", 3, "subs", "credit"),
  tx("expense", 22.5, "iFood almoço", 3, "food", "vr", { source: "telegram" }),

  // Semana passada
  tx("expense", 1850.0, "Aluguel maio", 4, "home", "pix"),
  tx("expense", 285.4, "Conta de luz", 6, "home", "pix"),
  tx("expense", 142.8, "Internet", 7, "home", "pix"),
  tx("expense", 95.0, "Consulta dentista", 7, "health", "debit"),
  tx("expense", 380.0, "Curso de inglês", 8, "edu", "pix"),
  tx("expense", 68.0, "Cinema + pipoca", 9, "leisure", "credit"),
  tx("expense", 165.0, "Ração do Bob (3kg)", 10, "pets", "debit"),

  // 2 semanas
  tx("expense", 240.0, "Jantar aniversário", 13, "food", "credit", {
    installment_number: 1,
    installments_total: 3,
  }),
  tx("expense", 78.5, "Uber 99", 14, "transport", "credit"),
  tx("expense", 38.0, "Padaria semana", 15, "food", "cash"),
  tx("expense", 195.0, "Calça nova", 16, "leisure", "credit"),
  tx("expense", 32.0, "Café Starbucks", 17, "food", "credit"),

  // 3 semanas
  tx("expense", 145.0, "Mercado feira", 19, "market", "pix"),
  tx("expense", 250.0, "Academia mensal", 20, "leisure", "pix"),
  tx("expense", 89.0, "Livro técnico", 22, "edu", "credit"),
  tx("expense", 412.0, "Conserto carro", 24, "transport", "credit", {
    installment_number: 1,
    installments_total: 2,
  }),
  tx("expense", 65.0, "Sushi delivery", 25, "food", "credit", { source: "telegram" }),
  tx("expense", 23.5, "Farmácia remédio", 26, "health", "cash"),

  // 28-30 dias
  tx("income", 350, "Reembolso plano saúde", 27, "salary", "pix"),
  tx("expense", 180.0, "Presente aniv. da mãe", 29, "leisure", "pix"),
];

/** 12 meses de tendência: receita estável, gasto subindo lentamente */
export const PREVIEW_TREND = Array.from({ length: 12 }, (_, i) => {
  const offset = 11 - i;
  const month = format(subMonths(today, offset), "yyyy-MM");
  const base = 9500 + (i % 4) * 250;
  const expense = 3800 + i * 80 + Math.sin(i) * 400;
  return { month, income: base, expense: Math.max(2500, expense) };
});

export const PREVIEW_HOUSEHOLD_NAME = "Família Carvalho";

export const PREVIEW_CARDS = [
  { id: "c1", name: "Nubank Roxinho", closing_day: 28, due_day: 5, credit_limit: 6000 },
  { id: "c2", name: "Itaú Click", closing_day: 18, due_day: 25, credit_limit: 4500 },
];
