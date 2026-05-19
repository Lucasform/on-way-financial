import { fmtRelative } from "@/lib/dates";
import { formatBRL } from "@/lib/money";

/**
 * Templates Markdown do Telegram. Diferenças vs WhatsApp:
 *  - bold: *texto*
 *  - italic: _texto_
 *  - código: `texto`
 *  - escapamos `_` e `*` em conteúdo dinâmico para não quebrar a sintaxe.
 */
function safe(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/([_*`\[\]()])/g, "\\$1");
}

export function tgHelpMessage(): string {
  return [
    "🤖 *ON WAY FINANCIAL*",
    "",
    "*Comandos:*",
    "• `/despesa 50 mercado #Mercado @pix` ·registra despesa",
    "• `/receita 5000 salário #Salário` ·registra receita",
    "• `/saldo` ·resumo do mês",
    "• `/categorias` ·lista categorias",
    "• `/metodos` ·lista métodos de pagamento",
    "• `/obra 230 cimento` ·atalho para obra ativa",
    "• `/viagem 800 voo` ·atalho para viagem ativa",
    "• `/cancelar` ·desfaz última transação (5 min)",
    "• `/ajuda` ·este menu",
    "",
    "Ou apenas escreva: _gastei 50 no mercado ontem pix_ que eu entendo.",
  ].join("\n");
}

export function tgConfirmTransaction(args: {
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
    `💰 ${formatBRL(args.amount)}${args.description ? ` ·${safe(args.description)}` : ""}`,
    args.categoryName ? `🏷️ ${safe(args.categoryName)}` : null,
    args.paymentName ? `💳 ${safe(args.paymentName)}` : null,
    `📅 ${fmtRelative(args.occurredAt)}`,
    "",
    "_Envie /cancelar em até 5 min para desfazer._",
  ]
    .filter(Boolean)
    .join("\n");
}

export function tgWelcomeNotLinked(appUrl: string): string {
  return [
    "👋 *Olá!*",
    "",
    "Este chat ainda não está vinculado a nenhuma conta no ON WAY FINANCIAL.",
    "",
    `Pra vincular:`,
    `1. Abra ${appUrl}/settings`,
    "2. Em *Telegram*, clique em *Conectar*",
    "3. Será gerado um link `/start <código>` ·abra ele aqui mesmo.",
  ].join("\n");
}

export function tgLinkedSuccess(name: string | null): string {
  return [
    "🎉 *Conta vinculada!*",
    "",
    `Oi${name ? ` *${safe(name)}*` : ""}, agora você pode registrar despesas direto por aqui.`,
    "",
    "Envie `/ajuda` para ver os comandos ou simplesmente escreva algo como _gastei 50 no mercado pix_.",
  ].join("\n");
}

export function tgLinkInvalid(): string {
  return [
    "❌ Esse link de vínculo é inválido ou já expirou.",
    "",
    "Gere um novo em *Configurações → Telegram* dentro do app.",
  ].join("\n");
}

export function tgLowConfidence(args: {
  amount: number;
  categoryHint: string | null;
  paymentHint: string | null;
}): string {
  return [
    "🤔 *Quase entendi… confirma pra mim?*",
    "",
    `Adicionar *${formatBRL(args.amount)}*` +
      (args.categoryHint ? ` em *${safe(args.categoryHint)}*` : "") +
      (args.paymentHint ? ` via *${safe(args.paymentHint)}*` : "") +
      "?",
    "",
    "Responda *SIM* para confirmar ou *NÃO* para descartar.",
  ].join("\n");
}

export function tgBalance(args: {
  income: number;
  expense: number;
  topCategory: { name: string; total: number } | null;
}): string {
  const saldo = args.income - args.expense;
  return [
    "📊 *Resumo do mês*",
    `Receitas: ${formatBRL(args.income)}`,
    `Despesas: ${formatBRL(args.expense)}`,
    `Saldo: *${formatBRL(saldo)}*`,
    args.topCategory
      ? `\nMaior categoria: ${safe(args.topCategory.name)} (${formatBRL(args.topCategory.total)})`
      : "",
  ].join("\n");
}
