import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { extractJson } from "@/lib/utils";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

const SuggestionSchema = z.object({
  tmp_id: z.string(),
  category: z.string().nullable(),
  payment: z
    .enum(["cash", "pix", "debit_card", "credit_card", "bank_transfer", "boleto", "meal_voucher", "other"])
    .nullable(),
});

const SuggestionsResponse = z.object({
  suggestions: z.array(SuggestionSchema),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

interface CategorizeInput {
  rows: { tmp_id: string; description: string; type: string; amount: number }[];
  categories: { name: string; type: string }[];
}

/**
 * Pede pra Claude sugerir categoria + método pra uma lista de transações em lote.
 * Resposta é validada por Zod e devolvida.
 */
export async function categorizeBatch(input: CategorizeInput): Promise<Suggestion[]> {
  if (input.rows.length === 0) return [];
  const env = getServerEnv();

  const catList = input.categories.map((c) => `- ${c.name} (${c.type === "income" ? "receita" : "despesa"})`).join("\n");

  const user = JSON.stringify(
    input.rows.map((r) => ({
      tmp_id: r.tmp_id,
      description: r.description,
      type: r.type,
      amount: r.amount,
    })),
  );

  const system = `Você categoriza transações financeiras brasileiras pro app ON FIN.

Categorias disponíveis (use EXATAMENTE estes nomes):
${catList}

Métodos de pagamento possíveis: pix, debit_card, credit_card, bank_transfer, boleto, meal_voucher, cash.

Devolva APENAS um JSON neste formato:
\`\`\`json
{
  "suggestions": [
    { "tmp_id": "x", "category": "Nome exato da categoria ou null", "payment": "pix" | "credit_card" | ... | null }
  ]
}
\`\`\`

Heurísticas:
- "uber/99/táxi/posto/combustível" → Transporte
- "pão de açúcar/carrefour/atacadão/extra" → Mercado
- "ifood/rappi/restaurante/lanche/pizza" → Alimentação
- "luz/cemig/copel/sabesp/aluguel/condomínio/internet/vivo/tim/claro" → Moradia
- "drogasil/drogaria/farmácia/clínica/dentista/médico" → Saúde
- "netflix/spotify/disney/youtube premium/icloud/cinema/show" → Lazer ou Assinaturas
- "escola/faculdade/curso/udemy/alura" → Educação
- "petshop/petlove/ração" → Pets
- "salário/folha/holerite" → Salário
- "tesouro/cdb/etf/dividendos/rendimento" → Investimentos
- Se não der pra inferir com clareza, use null.
- Pagamento: "pix" no texto → pix; "débito" → debit_card; "crédito/cartão" → credit_card; senão null.`;

  const res = await client().messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const first = res.content[0];
  if (!first || first.type !== "text") return [];
  const json = extractJson(first.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const result = SuggestionsResponse.safeParse(parsed);
  if (!result.success) return [];
  return result.data.suggestions;
}
