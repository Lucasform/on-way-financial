export interface ChecklistTemplateItem {
  phase_name: string;
  category: "material" | "serviço" | "processo";
  name: string;
  unit?: string;
}

export const DEFAULT_CHECKLIST: ChecklistTemplateItem[] = [
  { phase_name: "Terraplenagem", category: "processo", name: "Limpeza do terreno (capina e destocamento)" },
  { phase_name: "Terraplenagem", category: "processo", name: "Locação da obra (gabarito)" },
  { phase_name: "Terraplenagem", category: "serviço", name: "Retirada de terra (bota-fora)", unit: "m3" },
  { phase_name: "Terraplenagem", category: "serviço", name: "Aterro e compactação", unit: "m3" },
  { phase_name: "Terraplenagem", category: "serviço", name: "Nivelamento e regularização do solo" },

  { phase_name: "Fundação", category: "processo", name: "Escavação de sapatas/valas/radier" },
  { phase_name: "Fundação", category: "material", name: "Brita para lastro", unit: "m3" },
  { phase_name: "Fundação", category: "material", name: "Ferro/aço para fundação", unit: "kg" },
  { phase_name: "Fundação", category: "material", name: "Concreto para fundação", unit: "m3" },
  { phase_name: "Fundação", category: "material", name: "Forma de madeira para fundação" },
  { phase_name: "Fundação", category: "material", name: "Impermeabilizante de lastro/fundação" },
  { phase_name: "Fundação", category: "serviço", name: "Armação e concretagem da fundação" },

  { phase_name: "Estrutura", category: "material", name: "Ferro/aço para pilares e vigas", unit: "kg" },
  { phase_name: "Estrutura", category: "material", name: "Concreto para pilares, vigas e laje", unit: "m3" },
  { phase_name: "Estrutura", category: "material", name: "Forma de madeira/plástico para estrutura" },
  { phase_name: "Estrutura", category: "material", name: "Laje (pré-moldada vigota+lajota ou maciça)", unit: "m2" },
  { phase_name: "Estrutura", category: "serviço", name: "Montagem de forma e armação" },
  { phase_name: "Estrutura", category: "serviço", name: "Concretagem de pilares/vigas/laje" },

  { phase_name: "Alvenaria", category: "material", name: "Tijolo/bloco cerâmico ou de concreto", unit: "un" },
  { phase_name: "Alvenaria", category: "material", name: "Cimento", unit: "saco" },
  { phase_name: "Alvenaria", category: "material", name: "Areia", unit: "m3" },
  { phase_name: "Alvenaria", category: "material", name: "Cal", unit: "saco" },
  { phase_name: "Alvenaria", category: "material", name: "Vergas e contravergas" },
  { phase_name: "Alvenaria", category: "serviço", name: "Levantamento de paredes (pedreiro)" },

  { phase_name: "Cobertura", category: "material", name: "Madeira para estrutura do telhado (tesoura/caibro/ripa)" },
  { phase_name: "Cobertura", category: "material", name: "Telha (cerâmica, fibrocimento ou metálica)", unit: "un" },
  { phase_name: "Cobertura", category: "material", name: "Manta subcobertura / isolante térmico" },
  { phase_name: "Cobertura", category: "material", name: "Calha e rufo" },
  { phase_name: "Cobertura", category: "serviço", name: "Montagem da estrutura e telhamento" },

  { phase_name: "Instalações Elétricas", category: "material", name: "Fiação elétrica", unit: "m" },
  { phase_name: "Instalações Elétricas", category: "material", name: "Eletroduto e conduletes" },
  { phase_name: "Instalações Elétricas", category: "material", name: "Quadro de distribuição e disjuntores" },
  { phase_name: "Instalações Elétricas", category: "material", name: "Tomadas, interruptores e caixinhas" },
  { phase_name: "Instalações Elétricas", category: "serviço", name: "Passagem de infra e instalação (eletricista)" },

  { phase_name: "Instalações Hidrossanitárias", category: "material", name: "Tubos e conexões de água fria/quente" },
  { phase_name: "Instalações Hidrossanitárias", category: "material", name: "Tubos e conexões de esgoto" },
  { phase_name: "Instalações Hidrossanitárias", category: "material", name: "Caixa d'água" },
  { phase_name: "Instalações Hidrossanitárias", category: "material", name: "Registros e válvulas" },
  { phase_name: "Instalações Hidrossanitárias", category: "serviço", name: "Instalação hidráulica e sanitária (encanador)" },

  { phase_name: "Impermeabilização", category: "material", name: "Manta ou impermeabilizante líquido" },
  { phase_name: "Impermeabilização", category: "serviço", name: "Aplicação (laje, banheiro, área externa)" },

  { phase_name: "Reboco e Chapisco", category: "material", name: "Cimento e areia para chapisco/reboco" },
  { phase_name: "Reboco e Chapisco", category: "serviço", name: "Chapisco, emboço e reboco (interno/externo)" },

  { phase_name: "Contrapiso", category: "material", name: "Cimento, areia e brita para contrapiso" },
  { phase_name: "Contrapiso", category: "serviço", name: "Execução do contrapiso" },

  { phase_name: "Esquadrias", category: "material", name: "Portas internas e externas", unit: "un" },
  { phase_name: "Esquadrias", category: "material", name: "Janelas (alumínio/madeira/PVC)", unit: "un" },
  { phase_name: "Esquadrias", category: "material", name: "Fechaduras e dobradiças" },
  { phase_name: "Esquadrias", category: "serviço", name: "Instalação de portas e janelas" },

  { phase_name: "Revestimentos", category: "material", name: "Piso (porcelanato/cerâmico/laminado)", unit: "m2" },
  { phase_name: "Revestimentos", category: "material", name: "Azulejo/revestimento de parede", unit: "m2" },
  { phase_name: "Revestimentos", category: "material", name: "Argamassa colante e rejunte" },
  { phase_name: "Revestimentos", category: "serviço", name: "Assentamento de piso e revestimento" },

  { phase_name: "Pintura", category: "material", name: "Massa corrida / textura" },
  { phase_name: "Pintura", category: "material", name: "Tinta interna e externa", unit: "lata" },
  { phase_name: "Pintura", category: "material", name: "Fita crepe, lixa, rolos e pincéis" },
  { phase_name: "Pintura", category: "serviço", name: "Pintura interna e externa (pintor)" },

  { phase_name: "Louças e Metais", category: "material", name: "Vaso sanitário e caixa acoplada", unit: "un" },
  { phase_name: "Louças e Metais", category: "material", name: "Pia, cuba e tanque", unit: "un" },
  { phase_name: "Louças e Metais", category: "material", name: "Torneiras, chuveiro e registros de acabamento" },
  { phase_name: "Louças e Metais", category: "material", name: "Box de banheiro" },
  { phase_name: "Louças e Metais", category: "serviço", name: "Instalação de louças, metais e acabamentos" },

  { phase_name: "Acabamento Elétrico", category: "material", name: "Luminárias e lâmpadas" },
  { phase_name: "Acabamento Elétrico", category: "material", name: "Espelhos de tomada/interruptor" },
  { phase_name: "Acabamento Elétrico", category: "serviço", name: "Instalação de luminárias e testes finais" },

  { phase_name: "Limpeza Final e Entrega", category: "serviço", name: "Limpeza pós-obra (grossa e fina)" },
  { phase_name: "Limpeza Final e Entrega", category: "processo", name: "Vistoria final e ajustes (retoques)" },
  { phase_name: "Limpeza Final e Entrega", category: "processo", name: "Habite-se / documentação de conclusão" },
];
