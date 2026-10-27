import "server-only";

import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { todayISO } from "@/lib/dates";
import { getServerEnv } from "@/lib/env";
import { formatBRL } from "@/lib/money";
import { createExpense, normalizeName, type ExpenseStatus } from "@/lib/obra-expense";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export type ProposedAction =
  | {
      type: "expense";
      name: string;
      amount: number;
      status: ExpenseStatus;
      date: string;
      supplier: { id: string; name: string } | { newName: string };
    }
  | {
      type: "supplier";
      name: string;
      category: string;
      phone: string | null;
      phone2: string | null;
      cnpj: string | null;
      address: string | null;
      notes: string | null;
    }
  | {
      type: "checklist";
      phase_name: string;
      category: "material" | "serviço" | "processo";
      name: string;
      unit: string | null;
      estimated_value: number | null;
    };

interface ProposalPayload {
  hh: string;
  uid: string;
  exp: number;
  actions: ProposedAction[];
}

const PROPOSAL_TTL_MS = 30 * 60_000;
const SUPPLIER_CATEGORIES = ["material", "mão-de-obra", "equipamento", "serviço", "outro"];
const CHECKLIST_CATEGORIES = ["material", "serviço", "processo"] as const;

export const REGISTER_EXPENSE_TOOL = {
  name: "register_expense",
  description:
    "Prepara o registro de uma despesa da obra, no mesmo fluxo da tela Adicionar despesa: item, valor total, " +
    "fornecedor e situação (cotacao = só preço passado, ainda não gasto; executada = já foi pago/feito, cria a " +
    "cotação aceita e o custo). NÃO grava nada: o app mostra um cartão e o usuário confirma. Só chame quando " +
    "souber os 4 dados; se faltar fornecedor ou não estiver claro se já foi pago, PERGUNTE antes. " +
    "Pra várias despesas, chame uma vez por despesa.",
  input_schema: {
    type: "object" as const,
    properties: {
      item_name: { type: "string", description: "O que foi (ex: Cimento, Pedreiro, Frete)." },
      amount: { type: "number", description: "Valor total em reais." },
      supplier_name: { type: "string", description: "Nome do fornecedor, como o usuário falou." },
      status: { type: "string", enum: ["cotacao", "executada"], description: "cotacao ou executada." },
      date: { type: "string", description: "Data YYYY-MM-DD, se o usuário disser. Padrão: hoje." },
    },
    required: ["item_name", "amount", "supplier_name", "status"],
  },
};

export const ADD_SUPPLIER_TOOL = {
  name: "add_supplier",
  description:
    "Prepara o cadastro de um fornecedor (loja, prestador, mão de obra). NÃO grava: o usuário confirma no cartão.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Nome do fornecedor (obrigatório)." },
      category: { type: "string", enum: SUPPLIER_CATEGORIES, description: "Padrão: material." },
      phone: { type: "string", description: "Telefone principal, se mencionado." },
      phone2: { type: "string", description: "Segundo telefone, se mencionado." },
      cnpj: { type: "string", description: "CNPJ, se mencionado." },
      address: { type: "string", description: "Endereço, se mencionado." },
      notes: { type: "string", description: "Observações livres, se houver." },
    },
    required: ["name"],
  },
};

export const ADD_CHECKLIST_ITEM_TOOL = {
  name: "add_checklist_item",
  description:
    "Prepara um item de referência no checklist da obra, por fase (Terraplenagem, Fundação, Alvenaria...). " +
    "NÃO grava: o usuário confirma no cartão.",
  input_schema: {
    type: "object" as const,
    properties: {
      phase_name: { type: "string", description: "Nome da fase." },
      category: { type: "string", enum: [...CHECKLIST_CATEGORIES], description: "Padrão: material." },
      name: { type: "string", description: "Nome do item/processo/serviço." },
      unit: { type: "string", description: "Unidade, se fizer sentido." },
      estimated_value: { type: "number", description: "Valor estimado, se souber." },
    },
    required: ["phase_name", "name"],
  },
};

export const WRITE_TOOL_NAMES = new Set([REGISTER_EXPENSE_TOOL.name, ADD_SUPPLIER_TOOL.name, ADD_CHECKLIST_ITEM_TOOL.name]);

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, max) : null;
}

function validDate(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
}

/** Converte a chamada de ferramenta da IA numa ação proposta, validada. Retorna erro em texto pra IA. */
export async function planAction(
  db: Db,
  householdId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<{ action: ProposedAction } | { error: string }> {
  if (toolName === REGISTER_EXPENSE_TOOL.name) {
    const name = str(input.item_name, 200);
    const supplierName = str(input.supplier_name, 120);
    const amount = typeof input.amount === "number" ? Math.round(input.amount * 100) / 100 : NaN;
    const status = input.status === "cotacao" || input.status === "executada" ? input.status : null;
    if (!name) return { error: "Falta o nome do item. Pergunte ao usuário." };
    if (!(amount > 0 && amount <= 10_000_000)) return { error: "Valor inválido. Pergunte o valor ao usuário." };
    if (!supplierName) return { error: "Falta o fornecedor. Pergunte ao usuário de qual fornecedor foi." };
    if (!status) return { error: "Não está claro se já foi pago (executada) ou é só cotação. Pergunte ao usuário." };

    const { data: suppliers } = await db.from("suppliers").select("id, name").eq("household_id", householdId);
    const wanted = normalizeName(supplierName);
    const exact = (suppliers ?? []).find((s) => normalizeName(s.name) === wanted);
    let supplier: { id: string; name: string } | { newName: string };
    if (exact) {
      supplier = exact;
    } else {
      const partial = (suppliers ?? []).filter((s) => {
        const n = normalizeName(s.name);
        return n.includes(wanted) || wanted.includes(n);
      });
      if (partial.length > 1) {
        return { error: `"${supplierName}" bate com mais de um fornecedor (${partial.map((s) => s.name).join(", ")}). Pergunte qual é.` };
      }
      supplier = partial[0] ?? { newName: supplierName };
    }
    return { action: { type: "expense", name, amount, status, date: validDate(input.date) ?? todayISO(), supplier } };
  }

  if (toolName === ADD_SUPPLIER_TOOL.name) {
    const name = str(input.name, 120);
    if (!name) return { error: "Falta o nome do fornecedor." };
    const category = typeof input.category === "string" && SUPPLIER_CATEGORIES.includes(input.category) ? input.category : "material";
    return {
      action: {
        type: "supplier",
        name,
        category,
        phone: str(input.phone, 40),
        phone2: str(input.phone2, 40),
        cnpj: str(input.cnpj, 30),
        address: str(input.address, 300),
        notes: str(input.notes, 500),
      },
    };
  }

  if (toolName === ADD_CHECKLIST_ITEM_TOOL.name) {
    const phase = str(input.phase_name, 80);
    const name = str(input.name, 200);
    if (!phase || !name) return { error: "Falta a fase ou o nome do item." };
    const category = CHECKLIST_CATEGORIES.find((c) => c === input.category) ?? "material";
    const est = typeof input.estimated_value === "number" && input.estimated_value > 0 ? input.estimated_value : null;
    return { action: { type: "checklist", phase_name: phase, category, name, unit: str(input.unit, 20), estimated_value: est } };
  }

  return { error: "Ferramenta desconhecida." };
}

function brDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function describeAction(a: ProposedAction): string {
  if (a.type === "expense") {
    const supplier = "id" in a.supplier ? a.supplier.name : `${a.supplier.newName} (fornecedor NOVO, vai ser cadastrado)`;
    if (a.status === "executada") {
      return `Despesa EXECUTADA: ${a.name}, ${formatBRL(a.amount)}, em ${supplier}, data ${brDate(a.date)}. Cria a cotação já aceita e o custo feito.`;
    }
    return `Cotação EM ABERTO: ${a.name}, ${formatBRL(a.amount)}, em ${supplier}. Fica em Cotações, ainda não vira custo.`;
  }
  if (a.type === "supplier") {
    const extras = [a.phone && `tel ${a.phone}`, a.phone2 && `tel ${a.phone2}`, a.cnpj && `CNPJ ${a.cnpj}`, a.address]
      .filter(Boolean)
      .join(", ");
    return `Novo fornecedor: ${a.name} (${a.category})${extras ? `, ${extras}` : ""}.`;
  }
  return `Checklist, fase "${a.phase_name}": ${a.name}${a.estimated_value ? `, ${formatBRL(a.estimated_value)}` : ""}.`;
}

function signingKey(): Buffer {
  return crypto.createHmac("sha256", getServerEnv().SUPABASE_SERVICE_ROLE_KEY).update("ai-proposal-v1").digest();
}

export function signProposal(householdId: string, userId: string, actions: ProposedAction[]): string {
  const payload: ProposalPayload = { hh: householdId, uid: userId, exp: Date.now() + PROPOSAL_TTL_MS, actions };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyProposal(token: string, householdId: string, userId: string): ProposedAction[] | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", signingKey()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ProposalPayload;
  if (payload.hh !== householdId || payload.uid !== userId || payload.exp < Date.now()) return null;
  return payload.actions;
}

/** Grava as ações confirmadas, com o cliente da sessão do usuário (RLS vale). */
export async function executeActions(
  db: Db,
  householdId: string,
  moduleId: string,
  actions: ProposedAction[],
): Promise<{ done: string[]; failed: string[] }> {
  const done: string[] = [];
  const failed: string[] = [];

  for (const a of actions) {
    if (a.type === "expense") {
      const r = await createExpense(db, {
        householdId,
        moduleId,
        name: a.name,
        amount: a.amount,
        supplier: "id" in a.supplier ? { id: a.supplier.id } : { newName: a.supplier.newName },
        status: a.status,
        date: a.date,
        notes: "[origem:ai_chat]",
      });
      if (r.ok) {
        done.push(
          a.status === "executada"
            ? `${a.name} ${formatBRL(a.amount)} em ${r.supplier.name} (executada)`
            : `cotação ${a.name} ${formatBRL(a.amount)} em ${r.supplier.name}`,
        );
      } else {
        failed.push(a.name);
      }
      continue;
    }

    if (a.type === "supplier") {
      const { data: existing } = await db.from("suppliers").select("id, name").eq("household_id", householdId);
      const dup = (existing ?? []).find((s) => normalizeName(s.name) === normalizeName(a.name));
      if (dup) {
        done.push(`fornecedor ${dup.name} (já existia)`);
        continue;
      }
      const { error } = await db.from("suppliers").insert({
        household_id: householdId,
        name: a.name,
        category: a.category,
        phone: a.phone,
        phone2: a.phone2,
        cnpj: a.cnpj,
        address: a.address,
        notes: a.notes,
      });
      if (error) failed.push(`fornecedor ${a.name}`);
      else done.push(`fornecedor ${a.name}`);
      continue;
    }

    const { data: last } = await db
      .from("obra_checklist_items")
      .select("position")
      .eq("module_id", moduleId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await db.from("obra_checklist_items").insert({
      module_id: moduleId,
      phase_name: a.phase_name,
      category: a.category,
      name: a.name,
      unit: a.unit,
      estimated_value: a.estimated_value,
      position: (last?.position ?? 0) + 1,
    });
    if (error) failed.push(`checklist ${a.name}`);
    else done.push(`checklist ${a.name}`);
  }

  return { done, failed };
}
