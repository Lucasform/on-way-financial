# 🏦 ON WAY FINANCIAL

> Copiloto financeiro familiar com bot de WhatsApp, IA, módulos especiais (Obra, Viagem, Carro Novo, Presente, Educação) e suporte a módulos personalizáveis.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + RLS + Auth + Storage) · WhatsApp Cloud API · Anthropic Claude · Vercel · PWA**.

---

## 🚀 Setup local

### Pré-requisitos
- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Conta Supabase (free)
- Conta Vercel (free)
- App WhatsApp Business no Meta for Developers
- API Key do Anthropic (Claude)

### Passo a passo

```bash
# 1) instalar deps
pnpm install

# 2) configurar variáveis
cp .env.local.example .env.local
# preencha conforme seção "Variáveis de ambiente" abaixo

# 3) Supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push                  # aplica migrations
pnpm db:types                     # gera src/types/database.ts

# 4) rodar
pnpm dev                          # http://localhost:3000
```

### Testes & qualidade

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint
pnpm test        # vitest unit
pnpm test:e2e    # playwright e2e
pnpm format
```

---

## 🔐 Variáveis de ambiente

Veja `.env.local.example`. Todas validadas com Zod em `src/lib/env.ts` — se faltar alguma, o boot falha.

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (público) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (server-only, ⚠️ NUNCA expor no client) |
| `NEXT_PUBLIC_APP_URL` | URL pública do app |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID (Meta) |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID |
| `WHATSAPP_ACCESS_TOKEN` | Token permanente (System User) |
| `WHATSAPP_VERIFY_TOKEN` | string aleatória para handshake do webhook |
| `WHATSAPP_APP_SECRET` | App Secret (para validar HMAC) |
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `ANTHROPIC_MODEL` | default `claude-haiku-4-5-20251001` |
| `CRON_SECRET` | string aleatória para autenticar o Vercel Cron |

---

## 🗄️ Banco de dados

As migrations vivem em `supabase/migrations`:

1. `0001_init.sql` — households, members, invites, categorias, métodos, transações, alertas, audit log, rate limit.
2. `0002_rls.sql` — Row Level Security em **todas** as tabelas + helpers `is_member_of`, `has_role_in`, `module_household`.
3. `0003_modules.sql` — `modules` + tabelas por kind (obra_phases/workers/gallery/messages, travel_items, car_options, gift_items, education_items, custom_items).
4. `0004_seed.sql` — trigger que ao criar household popula categorias padrão, métodos padrão e adiciona o criador como `owner`. Cria buckets de storage `receipts` e `obra-gallery` com policies por household.

Para zerar localmente: `supabase db reset`.

---

## 📲 Configurando o webhook do WhatsApp

1. No Meta for Developers, vá em **WhatsApp → Configuration → Callback URL**.
2. Cole `https://<seu-dominio>/api/whatsapp/webhook`.
3. Verify Token = valor de `WHATSAPP_VERIFY_TOKEN`.
4. Inscreva o webhook em `messages`.
5. Copie o **App Secret** da seção Basic Settings → `WHATSAPP_APP_SECRET`.

Validação do payload usa HMAC SHA-256 (header `x-hub-signature-256`) com `crypto.timingSafeEqual`.

---

## 🤖 Bot — comandos e IA híbrida

**Comandos `/...`** (parser determinístico, grátis):

| Comando | Descrição |
|---|---|
| `/despesa <valor> <desc> [#cat] [@método] [data]` | Cria despesa |
| `/receita <valor> <desc> [#cat]` | Cria receita |
| `/saldo` | Resumo do mês |
| `/categorias` | Lista categorias |
| `/metodos` | Lista métodos |
| `/obra <valor> <desc>` | Atalho para obra ativa |
| `/viagem <valor> <desc>` | Atalho para viagem ativa |
| `/cancelar` | Desfaz última transação (5 min) |
| `/ajuda` | Menu |

**Texto livre** vai para o `parseFreeText` (Claude haiku-4.5) que devolve JSON estruturado validado por Zod (`src/lib/ai/parser.ts`).

Mensagens de baixa confiança (`< 0.7`) viram pergunta no WhatsApp pedindo confirmação `SIM` / `NÃO` (estado em `whatsapp_sessions.state.pending`).

Rate limit: 60 msgs/min por telefone (tabela `whatsapp_rate_limit`).

---

## ⏰ Cron de alertas

Configurado em `vercel.json`:

```json
{ "path": "/api/cron/alerts?secret=$CRON_SECRET", "schedule": "0 11 * * *" }
```

Roda diariamente às **08:00 BRT** (11:00 UTC). Avalia `budget_exceeded`, `invoice_closing`, `goal_progress`, `recurring_due`, `custom`. Alertas `large_expense` disparam **em tempo real** dentro do `handleIncoming` quando uma despesa é registrada.

---

## 🧱 Módulos

| Kind | Rota | Funcionalidades |
|---|---|---|
| `obra` | `/modules/obra/[id]` | Fases (kanban), Equipe (WhatsApp), Galeria (Storage), Despesas, % orçamento |
| `travel` | `/modules/travel/[id]` | Itens (voo/hotel/transporte/comida/tour), planejado vs realizado |
| `car` | `/modules/car/[id]` | Comparativo de modelos, simulador PRICE, "já poupei" |
| `gift` | `/modules/gift/[id]` | Lista de presentes, ocasiões, marcado como comprado |
| `education` | `/modules/education/[id]` | Cursos, mensalidades, projeção anual |
| `custom` | `/modules/custom/[id]` | Campos definidos pelo usuário (texto/número/data) |

---

## 🧪 Estrutura de pastas

```
src/
├─ app/
│  ├─ (auth)/login, (auth)/callback
│  ├─ (app)/overview, transactions, categories, payment-methods, family, alerts, settings, onboarding, modules
│  ├─ api/whatsapp/{webhook,send}, ai/parse, cron/alerts, invite/accept
│  └─ invite/[token]
├─ components/
│  ├─ ui/        # shadcn-style (button, input, card, dialog, select, tabs, money, ...)
│  ├─ charts/    # daily-bars, category-donut (recharts)
│  ├─ transactions/
│  ├─ modules/   # obra-, travel-, car-, gift-, education-, custom- dashboards
│  ├─ auth/      # login-form, onboarding-wizard, invite-accept
│  └─ common/    # app-shell, household-switcher, user-menu, family-manager, alert-manager, settings-panel, query-provider
├─ lib/
│  ├─ supabase/  # server, client, admin (service role)
│  ├─ whatsapp/  # client, templates, handle (lógica de processamento)
│  ├─ ai/        # parser (Claude), prompts
│  ├─ env.ts     # Zod validation
│  ├─ household.ts, money.ts, dates.ts, utils.ts
├─ hooks/
├─ types/database.ts
└─ middleware.ts # refresh sessão + guards
```

---

## ✅ Definition of Done

- [x] App rodando em produção na Vercel com HTTPS.
- [x] Login via magic link / Google.
- [x] Onboarding com criação de família + categorias e métodos padrão (via trigger SQL).
- [x] Convite de membros com token + papéis owner/admin/viewer.
- [x] Adicionar despesa com parcelamento em N vezes → cria N transações.
- [x] WhatsApp livre `"gastei 50 mercado ontem pix"` cria transação + confirmação.
- [x] Comando `/despesa 230 cimento` vinculado ao módulo Obra ativo.
- [x] Overview com saldo, top categoria, gráficos (barras+pizza).
- [x] Obra: fases (kanban), galeria (Storage), mensagem para pedreiro via WhatsApp.
- [x] Travel: reservas, planejado vs realizado.
- [x] Alerta `budget_exceeded` dispara WhatsApp pelo cron.
- [x] Logout, troca de família, export CSV.
- [x] Lighthouse mobile ≥ 90 (PWA, performance, a11y).
- [x] CI verde (typecheck + lint + tests + build).

---

## 🚢 Deploy

### Vercel
1. **Import repo** no Vercel.
2. Configurar todas as envs da seção acima (use os mesmos valores do `.env.local`).
3. Build settings: framework Next.js (detectado automaticamente).
4. Deploy. Vercel Cron já está em `vercel.json`.

### Supabase
1. Criar projeto no dashboard.
2. `supabase link --project-ref <ref>` localmente.
3. `pnpm db:push` (aplica migrations).
4. No painel: **Auth → Providers** habilitar Google OAuth e Email (magic link).
5. **Auth → URL Configuration** adicionar `https://<dominio>/auth/callback`.

### WhatsApp (Meta)
1. Criar App Business + adicionar produto WhatsApp.
2. Pegar Phone Number ID, gerar System User com permissão `whatsapp_business_messaging` + `whatsapp_business_management`, token permanente.
3. Configurar webhook (ver seção anterior).
4. Adicionar números de teste em **WhatsApp → API Setup → Add phone number**.

---

## 🧰 Comandos úteis

```bash
pnpm dev                            # dev
pnpm typecheck                      # tsc strict
pnpm lint && pnpm format            # padrão de código
pnpm test && pnpm test:e2e          # testes
supabase db push                    # aplica migrations
supabase gen types typescript --linked > src/types/database.ts
```

---

## 📄 Licença

Privado. Todos os direitos reservados.
