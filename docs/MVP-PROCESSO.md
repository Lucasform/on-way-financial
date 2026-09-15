# MVP — Escopo, Segurança, Dívida técnica e Feedback (On Way Financial)

Disciplina da etapa MVP do Founder's Playbook. Atualizado 2026-06-23.

---

## 1. Escopo (o que faz, o que NÃO faz)

### O produto faz
- Contas, cartões e carteiras consolidados; saldo atual e projetado.
- Lançamento por WhatsApp/Telegram com categorização por IA, ou manual/import.
- Dashboard, transações, orçamentos, metas, relatórios gerenciais.
- Módulos genéricos (obra, etc.) com orçado x realizado e cotações por IA.

### O produto NÃO faz (por decisão)
- Não é software fiscal/contábil (não calcula imposto, não emite nota).
- Não é corretora/investimento (não opera ativos).
- Open Finance / sincronização bancária automática é roadmap futuro, não o MVP.

### Critério para adicionar uma feature nova
Só entra com evidência de usuário (vários pedindo o mesmo) e sinal de que o produto
não entrega valor sem ela. Entusiasmo não é critério.

## 2. Controle de scope creep
- Uma etapa do `ROADMAP.md` por vez; confirmar escopo antes de codar (CLAUDE.md §9).
- Toda ideia nova passa pelo critério acima.

## 3. Revisão de segurança (antes de usuários reais)
Checklist do estado atual:
- [x] RLS ativo nas tabelas de negócio (`household_id` + helper `is_member`).
- [x] Segredos só no servidor; `.env.local` no `.gitignore` (não versionado; o alarme
      de "vazamento no git" foi falso, as chaves estão só no arquivo local).
- [x] Regra de acesso literal a `NEXT_PUBLIC_*` (evita exposição/quebra).
- [ ] **Pendente:** 2FA/MFA (não implementado; os outros apps já têm TOTP, replicar).
- [ ] **Pendente:** habilitar `FORCE ROW LEVEL SECURITY`.
- [ ] **Pendente:** `SUPABASE_SERVICE_ROLE_KEY` do projeto novo para os webhooks.

## 4. Dívida técnica conhecida (logar sempre)
- **Zero testes automatizados** (maior dívida; ao menos cobrir `lib/` crítico e RLS).
- 2FA ausente (ver segurança).
- **Repositório duplicado:** existem 3 cópias do app (Documents, Orgs/source,
  Orgs/APP Financial). Consolidar em uma só (a com remote `on-way-financial.git`)
  e apagar as demais para evitar drift.
> Regra: toda dívida assumida entra aqui, com motivo e quando pagar.

## 5. Loop de feedback do usuário
- **Hoje:** não há intake de feedback.
- **Próximo passo (build curto):** tabela `feedback` (tipo, descrição, household_id)
  + modal "Enviar feedback / reportar problema" + visão para triar. Manter humano no loop.

---

## 6. Etapas 3-4 — Launch & Scale (prontidão)

### 19. Produto aguenta carga de produção
- Stack gerenciada (Vercel região gru1 + Supabase) escala bem no início.
- Pendente: monitoramento de runtime (sem Sentry ainda), teste de carga nos webhooks de ingestão.

### 20. Segurança e compliance (LGPD)
- Dados pessoais e financeiros sensíveis. Base legal: execução de contrato.
- RLS por `household_id`, segredos só no servidor. Pendente: 2FA (replicar TOTP dos outros apps) e FORCE RLS.
- Definir retenção e direitos do titular (acesso/exclusão).

### 24. Moat por profundidade de domínio
- `DOMINIO.md` externaliza regras de finanças e edge cases (transferência não é despesa, cartão, conciliação).
- Prática: cada edge case real (estorno, parcelas, moeda estrangeira) vira validação no parsing.

### 26. Workflow lock-in via integrações
- Integrações atuais: WhatsApp (Evolution), Telegram, IA (Anthropic).
- Próximo nível: conexão bancária (Open Finance) e API/webhook para o cliente.

### 28. Codificar conhecimento institucional
- Conhecimento vive em: CLAUDE.md, ADRs (docs/adr), DOMINIO.md, ROADMAP, skills e memória.
- Mantém o conhecimento transferível e fora da cabeça do fundador.

> Dependem de build (não marcar verde sem código): 2FA (item 14), data flywheel (25), Open Finance/API (26), intake de feedback (17).
