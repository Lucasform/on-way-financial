# On Way Financial — ROADMAP

App pessoal de finanças + gestão de obra. Stack: Next.js 14 (App Router, TS), Supabase (Postgres + Auth + RLS), Tailwind, Anthropic (lançamento por IA), Evolution API (WhatsApp) e Telegram Bot. Deploy alvo: Vercel + Supabase.

Marcar `[x]` em cada etapa **imediatamente** ao concluir (continuidade entre sessões).

---

## Concluído na sessão 2026-06-21 (resumo)
- [x] App em produção: https://on-way-financial.vercel.app (Supabase `czufplvixgyuxuxzgvio`)
- [x] Auth por servidor (`/api/auth`), magic link, login pré-confirmado
- [x] Identidade verde + logo (gráfico subindo + ON)
- [x] WhatsApp via Evolution (instância `onway_financial`) — chat "Mensagem para mim" + **grupo** (1ª msg de membro vincula a casa)
- [x] Sistema de **Módulos** (obra/viagem/carro/educação/presentes/custom): comparativo, etapas+template, despesas, galeria
- [x] **Cotações com IA** + **Fornecedores**
- [x] **Contas** (saldos), **Relatórios**, **Import OFX/CSV**, **Assistente IA flutuante**
- [x] **Família**: convite por link + grupo WhatsApp compartilhado
- [x] Infra: **cron de recorrências** (`/api/cron/recurring` + vercel.json), hardening de segurança (RLS/RPC/bucket)
- [ ] Pendência manual: ativar "Leaked password protection" no dashboard Supabase (Auth)

---

## Fase 0 — Fundação ✅ (feito nesta sessão)
- [x] Scaffold Next.js App Router + TS + Tailwind (tema claro/escuro via `next-themes`, design tokens HSL)
- [x] Clients Supabase (browser / server SSR / admin service-role)
- [x] `getServerEnv()` / `getPublicEnv()` com todas as integrações
- [x] Schema inicial `0001_init.sql` (households, members, accounts, bank_connections, categories, transactions, budgets, recurring_rules, goals, obra completa, ingest_inbox)
- [x] RLS multi-tenant por `household_id` (helper `is_member`)
- [x] Auth (login/signup email+senha) + middleware de proteção de rotas
- [x] Bootstrap automático de household no primeiro acesso (`loadActiveContext`)
- [x] Shell autenticado: sidebar, topbar, theme toggle, navegação
- [x] Dashboard com métricas do mês (entradas/saídas/saldo + recentes)
- [x] Lançamentos: lista + **Lançar com IA** (parse → preview → confirmar)
- [x] Orçamentos: progresso por categoria vs gasto do mês
- [x] Obra: cards de projeto com orçamento × realizado
- [x] Configurações: vínculo de canais WhatsApp/Telegram
- [x] Ingestão por chat: webhook Telegram + webhook Evolution (WhatsApp) → pipeline único `ingestMessage` → parse IA → grava transação → responde
- [x] Rota IA web `/api/ai/parse`

## Fase 1 — Rodar de verdade ✅ (feito 2026-06-21)
- [x] `tsc --noEmit` limpo + `next build` ok
- [x] Projeto Supabase dedicado `on-way-financial` (czufplvixgyuxuxzgvio, sa-east-1) + `0001_init.sql` aplicado
- [x] Seed de categorias padrão (12) + conta Lucas pré-confirmada
- [x] `.env.local` preenchido; smoke test autenticado login → dashboard/transactions/obra (200)
- [x] Deploy Vercel produção: https://on-way-financial.vercel.app + env repontado
- [x] IA parse validado em prod (Anthropic haiku)
- [ ] Gerar `src/types/database.ts` real via `supabase gen types`
- [ ] Colar `SUPABASE_SERVICE_ROLE_KEY` (do dashboard) p/ ligar webhooks WhatsApp/Telegram

## Fase 2 — Lançamento por chat em produção
- [ ] Registrar webhook Telegram (`setWebhook` com secret) e testar `/start` + deep link de vínculo automático (gerar código no app, bot lê `/start <code>`)
- [ ] Subir instância Evolution API (Railway, blueprint OnWay) e apontar webhook `messages.upsert`
- [ ] Fluxo de confirmação no WhatsApp (responder com botões / "sim/não" para baixa confiança)
- [ ] Lançamento por foto de nota fiscal (OCR/visão) via IA — anexo no Storage
- [ ] Áudio → transcrição → parse (mensagem de voz no WhatsApp)

## Fase 3 — Integração bancária (Open Finance)
- [ ] Escolher provedor (Pluggy é o mais simples no BR; Belvo alternativa)
- [ ] Cofre de credenciais: cifrar `credentials_encrypted` com AES-GCM (chave em env), nunca texto puro
- [ ] Connect widget → salvar `external_item_id` em `bank_connections`
- [ ] Job de sync (Edge Function/cron) → importar transações com `external_id` (dedup)
- [ ] Conciliação: casar transação importada com lançamento manual/IA
- [ ] Categorização automática por histórico/IA

## Fase 4 — Obra (gestão completa)
- [x] CRUD de projeto/etapas/itens de orçamento/despesas/documentos (página de detalhe `/obra/[id]`)
- [x] Progresso % por etapa (slider), status do projeto
- [x] Orçado (itens) × realizado (despesas) com barra de uso
- [x] Galeria de fotos/documentos do andamento (Storage bucket `obra`, público)
- [x] Fornecedores e controle a pagar/pago + anexo de recibo por despesa
- [ ] Cronograma (Gantt simples) e linha do tempo
- [ ] Vincular despesa de obra a transação financeira (FK já existe)
- [ ] Relatório de obra exportável (PDF)

## Fase 5 — Finanças avançadas
- [x] Edição/exclusão + filtros (busca, tipo, categoria) de lançamentos
- [x] Recorrências: CRUD + pausar/ativar + "gerar lançamento agora" (avança próxima data)
- [x] Metas de economia com aporte e barra de progresso
- [x] Gráficos no dashboard: fluxo 6 meses (barras) + gastos por categoria (rosca)
- [ ] Recorrências automáticas (cron materializa `recurring_rules` sem clique)
- [ ] Transferências entre contas (UI; modelo já suporta)
- [ ] Cartão de crédito: fatura por ciclo (closing/due day), parcelamento
- [ ] Importação OFX/CSV manual

## Fase 6 — UI/UX premium
- [ ] Command palette (⌘K) para lançar/buscar/navegar
- [ ] Bottom nav mobile + PWA installable (offline shell)
- [ ] Animações (Framer Motion), skeletons, toasts, empty states ilustrados
- [ ] Dashboard configurável (widgets), gráficos interativos
- [ ] Acessibilidade (focus rings, aria, contraste AA nos dois temas)

## Fase 7 — Multiusuário & polimento
- [ ] Convidar membros para o household (papéis owner/admin/member/viewer)
- [ ] Trocar de household ativo
- [ ] Auditoria de alterações; soft-delete
- [ ] Testes (Vitest unit + Playwright e2e dos fluxos críticos)
- [ ] Notificações (orçamento estourando, fatura vencendo)

---

## Decisões técnicas
- **Tema**: dark-first, tokens HSL em `globals.css`, classe `.dark`, padrão do OnWay Design System.
- **IA de parse**: Anthropic com tool_use forçado (`record_expense`), modelo barato (`claude-haiku-4-5`) — ajustável por env.
- **Ingestão**: pipeline único `ingestMessage(channel, sender, text)` reaproveitado por Telegram e WhatsApp; vínculo por `telegram_chat_id` / `whatsapp_number` no membro.
- **Segurança**: RLS por household em todas as tabelas; service-role só em webhooks/ingestão; credenciais bancárias sempre cifradas.
- **Multi-tenant**: household = unidade de isolamento (padrão herdado de OnWay Condomínio / On Education).

## Como rodar
```bash
pnpm install
cp .env.local.example .env.local   # preencher
pnpm dev
```
Migrations em `supabase/migrations/`. Aplicar via Supabase CLI ou MCP.
