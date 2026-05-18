import { formatBRL } from "@/lib/money";
import { fmtRelative } from "@/lib/dates";

export function helpMessage(): string {
  return [
    "🤖 *ON WAY FINANCIAL*",
    "",
    "Comandos suportados:",
    "• `/despesa 50 mercado #Mercado @pix` — registra uma despesa",
    "• `/receita 5000 salário #Salário` — registra uma receita",
    "• `/saldo` — resumo do mês atual",
    "• `/categorias` — lista as categorias",
    "• `/metodos` — lista os métodos de pagamento",
    "• `/obra 230 cimento` — atalho para o módulo Obra ativo",
    "• `/viagem 800 voo` — atalho para o módulo Viagem ativo",
    "• `/cancelar` — desfaz a última transação (até 5 min)",
    "• `/ajuda` — este menu",
    "",
    "Ou apenas escreva normalmente: _“gastei 50 no mercado ontem pix”_ que eu entendo.",
  ].join("\n");
}

export function confirmTransaction(args: {
  type: "expense" | "income";
  amount: number;
  description: string | null;
  categoryName: string | null;
  paymentName: string | null;
  occurredAt: string;
}): string {
  const verb = args.type === "income" ? "Receita" : "Despesa";
  return [
    `✅ *${verb} registrada*`,
    `💰 ${formatBRL(args.amount)}${args.description ? ` — ${args.description}` : ""}`,
    args.categoryName ? `🏷️ ${args.categoryName}` : null,
    args.paymentName ? `💳 ${args.paymentName}` : null,
    `📅 ${fmtRelative(args.occurredAt)}`,
    "",
    "_Envie `/cancelar` em até 5 min para desfazer._",
  ]
    .filter(Boolean)
    .join("\n");
}

export function notLinkedMessage(appUrl: string): string {
  return [
    "👋 Olá! Este número ainda não está vinculado a nenhuma conta no ON WAY FINANCIAL.",
    "",
    `Acesse ${appUrl}/settings e adicione este telefone no seu perfil para começar a usar o bot.`,
  ].join("\n");
}

export function lowConfidenceMessage(args: {
  amount: number;
  categoryHint: string | null;
  paymentHint: string | null;
}): string {
  return [
    "🤔 Quase entendi… confirma pra mim?",
    `Você quer adicionar *${formatBRL(args.amount)}*` +
      (args.categoryHint ? ` em *${args.categoryHint}*` : "") +
      (args.paymentHint ? ` via *${args.paymentHint}*` : "") +
      "?",
    "",
    "Responda *SIM* para confirmar ou *NÃO* para descartar.",
  ].join("\n");
}

export function balanceMessage(args: {
  income: number;
  expense: number;
  topCategory: { name: string; total: number } | null;
}): string {
  const saldo = args.income - args.expense;
  return [
    "📊 *Resumo do mês*",
    `Receitas: ${formatBRL(args.income)}`,
    `Despesas: ${formatBRL(args.expense)}`,
    `Saldo:    *${formatBRL(saldo)}*`,
    args.topCategory
      ? `\nMaior categoria: ${args.topCategory.name} (${formatBRL(args.topCategory.total)})`
      : "",
  ].join("\n");
}
