import { HardHat, Plane, Car, GraduationCap, Gift, Sparkles, type LucideIcon } from "lucide-react";

export type ModuleKind = "obra" | "travel" | "car" | "education" | "gift" | "custom";

export type KindConfig = {
  label: string;
  icon: LucideIcon;
  accent: string;
  itemLabel: string; // singular
  plannedLabel: string;
  typeOptions: string[];
  template: string[];
};

export const KINDS: Record<ModuleKind, KindConfig> = {
  obra: {
    label: "Obra",
    icon: HardHat,
    accent: "#a16207",
    itemLabel: "Etapa",
    plannedLabel: "Orçado",
    typeOptions: ["Material", "Mão de obra", "Equipamento", "Serviço"],
    template: [
      "Fundação",
      "Estrutura",
      "Alvenaria",
      "Cobertura",
      "Instalações elétricas",
      "Instalações hidráulicas",
      "Reboco",
      "Piso",
      "Pintura",
      "Acabamento",
    ],
  },
  travel: {
    label: "Viagem",
    icon: Plane,
    accent: "#0ea5e9",
    itemLabel: "Item",
    plannedLabel: "Previsto",
    typeOptions: ["Passagem", "Hospedagem", "Transporte", "Alimentação", "Passeio", "Seguro"],
    template: ["Passagens", "Hospedagem", "Transporte local", "Alimentação", "Passeios", "Seguro viagem"],
  },
  car: {
    label: "Carro",
    icon: Car,
    accent: "#6366f1",
    itemLabel: "Opção",
    plannedLabel: "Preço",
    typeOptions: ["Modelo", "Seguro", "Documentação", "Acessório"],
    template: [],
  },
  education: {
    label: "Educação",
    icon: GraduationCap,
    accent: "#14b8a6",
    itemLabel: "Curso",
    plannedLabel: "Custo",
    typeOptions: ["Mensalidade", "Material", "Matrícula"],
    template: [],
  },
  gift: {
    label: "Presentes",
    icon: Gift,
    accent: "#ec4899",
    itemLabel: "Presente",
    plannedLabel: "Orçamento",
    typeOptions: ["Aniversário", "Natal", "Casamento", "Outro"],
    template: [],
  },
  custom: {
    label: "Personalizado",
    icon: Sparkles,
    accent: "#16a34a",
    itemLabel: "Item",
    plannedLabel: "Planejado",
    typeOptions: ["Tarefa", "Compra", "Outro"],
    template: [],
  },
};

export const KIND_LIST = Object.keys(KINDS) as ModuleKind[];

export const STATUS_LABEL: Record<string, string> = {
  planning: "Planejando",
  active: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};
