import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { todayISO } from "@/lib/dates";
import { getServerEnv } from "@/lib/env";
import { extractJson } from "@/lib/utils";
import type { ImportRow } from "@/lib/import/types";

const RawTxSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["expense", "income", "transfer"]).default("expense"),
  category_hint: z.string().nullable().optional(),
  payment_hint: z
    .enum(["cash", "pix", "debit_card", "credit_card", "bank_transfer", "boleto", "meal_voucher", "other"])
    .nullable()
    .optional(),
});

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM_PROMPT = `Você é um extrator de transações de extratos bancários brasileiros.
Recebe o texto bruto de um PDF de extrato (ou de um CSV/lista de transações) e devolve
APENAS um JSON com array de transações, sem texto extra:

\`\`\`json
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "texto curto da transação (até 100 chars)",
      "amount": número positivo,
      "type": "expense" | "income" | "transfer",
      "category_hint": string ou null,
      "payment_hint": "pix" | "credit_card" | "debit_card" | "bank_transfer" | "boleto" | "meal_voucher" | "cash" | null
    }
  ]
}
\`\`\`

Regras:
- Datas: converta dd/mm/yyyy → ISO YYYY-MM-DD.
- Valor SEMPRE positivo; o sinal vira no campo "type" (expense = saída, income = entrada).
- Categorias prováveis: Alimentação, Mercado, Transporte, Moradia, Saúde, Lazer, Educação,
  Assinaturas, Vestuário, Pets, Impostos, Salário, Investimentos, Outros.
- Ignore linhas de saldo, abertura, taxa zero, cabeçalhos repetidos.
- Se o texto mencionar PIX → payment_hint = "pix"; "compra crédito" → credit_card; etc.
- Se houver muitas transações (>50), inclua TODAS.
- Hoje é {{TODAY}}. Use isso pra desambiguar datas sem ano.`;

export interface ExtractResult {
  rows: ImportRow[];
  errors: number;
}

export async function extractTransactionsFromText(text: string): Promise<ExtractResult> {
  const env = getServerEnv();
  const trimmed = text.slice(0, 60_000); // proteção: limita ~15k tokens

  const response = await client().messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT.replace("{{TODAY}}", todayISO()),
    messages: [{ role: "user", content: trimmed }],
  });

  const first = response.content[0];
  if (!first || first.type !== "text") return { rows: [], errors: 1 };

  const json = extractJson(first.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { rows: [], errors: 1 };
  }

  const obj = parsed as { transactions?: unknown };
  if (!Array.isArray(obj.transactions)) return { rows: [], errors: 1 };

  const rows: ImportRow[] = [];
  let errors = 0;
  for (let i = 0; i < obj.transactions.length; i++) {
    const candidate = RawTxSchema.safeParse(obj.transactions[i]);
    if (!candidate.success) {
      errors++;
      continue;
    }
    const r = candidate.data;
    // Validar ISO
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      errors++;
      continue;
    }
    rows.push({
      tmp_id: `ai-${i}`,
      type: r.type,
      amount: r.amount,
      description: r.description.slice(0, 200),
      occurred_at: r.date,
      category_hint: r.category_hint ?? null,
      payment_hint: r.payment_hint ?? null,
      notes: null,
      selected: true,
      is_duplicate: false,
    });
  }
  return { rows, errors };
}
