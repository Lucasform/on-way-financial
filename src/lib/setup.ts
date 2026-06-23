import { ArrowRightLeft, Wallet, LayoutGrid, ListChecks, Truck, Target, type LucideIcon } from "lucide-react";

export type ObjectKey = "transactions" | "accounts" | "modules" | "module_items" | "suppliers" | "goals";

export const OBJECTS: Record<ObjectKey, { label: string; singular: string; icon: LucideIcon }> = {
  transactions: { label: "Lançamentos", singular: "Lançamento", icon: ArrowRightLeft },
  accounts: { label: "Contas", singular: "Conta", icon: Wallet },
  modules: { label: "Módulos", singular: "Módulo", icon: LayoutGrid },
  module_items: { label: "Itens de módulo", singular: "Item", icon: ListChecks },
  suppliers: { label: "Fornecedores", singular: "Fornecedor", icon: Truck },
  goals: { label: "Metas", singular: "Meta", icon: Target },
};

export const OBJECT_KEYS = Object.keys(OBJECTS) as ObjectKey[];

export const FIELD_TYPES: Record<string, string> = {
  text: "Texto",
  textarea: "Texto longo",
  number: "Número",
  currency: "Moeda (R$)",
  date: "Data",
  checkbox: "Sim/Não",
  picklist: "Lista de opções",
  url: "URL",
  phone: "Telefone",
};

export type CustomField = {
  id: string;
  object_key: ObjectKey;
  api_name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  help: string | null;
  position: number;
  active: boolean;
};

export function toApiName(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "campo";
}
