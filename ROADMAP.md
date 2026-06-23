# ON WAY FINANCIAL — Roadmap

Base de desenvolvimento. Atualizada em 2026-05-28.

---

## 1. Pendências imediatas (fazer agora)

| Item | Quem | Status |
|---|---|---|
| Push do commit `7135399` (D + E: atalhos + signup confirm) | Lucas autoriza | Local, falta push |
| Commit + push da feature Recorrências (I) | Lucas autoriza | Local, falta commit |
| Aplicar migration `0009_recurring.sql` no Supabase | Lucas | Pendente |
| Redeploy Vercel pra pegar envs novas (`RESEND_API_KEY`, `INVITE_FROM_EMAIL`, `INVITE_REPLY_TO`) | Lucas | Pendente |
| Testar convite, reset senha, magic link com novo SMTP | Lucas | Pendente |

---

## 2. Em produção

### Features
| # | Feature | Notas |
|---|---|---|
| A | Reset de senha | Link "Esqueci a senha" no `/login` + página `/reset-password`. Usa `supabase.auth.resetPasswordForEmail` |
| B | Dark/light toggle | Já existia. Componente em `theme-toggle.tsx`, persistência `localStorage.onway-theme` |
| C | Busca global em transações | `/transactions?q=...` busca em descrição, notas, valor (se numérico) e nome de categoria |
| L | Resumo mensal Telegram | Cron `0 12 1 * *` (dia 1, 09h SP) agrega mês anterior por household, top 5 categorias + top 3 gastos. Envia pros members com `telegram_chat_id` |

### Configuração de email (parcial)
- ✅ DNS Resend (DKIM, MX, SPF) verificado no Cloudflare pra `onwaytech.com.br`
- ✅ API key Resend criada (`re_...` — armazenada em env)
- ✅ Resend `from` com nome amigável + `reply_to` (código deployado)
- ⏳ Envs Vercel: `RESEND_API_KEY`, `INVITE_FROM_EMAIL=no-reply@onwaytech.com.br`, `INVITE_REPLY_TO=suporte@onwaytech.com.br` (adicionadas, falta redeploy)
- ⏳ Supabase SMTP custom (smtp.resend.com:465, user `resend`, sender `no-reply@onwaytech.com.br`) — provavelmente salvo, falta confirmar
- ⏳ DMARC atual: `p=reject` (agressivo; revisar pra `p=none` ou `p=quarantine` enquanto valida)

---

## 3. Em commit local (falta push pra prod)

| # | Feature | Commit |
|---|---|---|
| D | Atalhos de teclado (`n`, `/`, `g+letra`, `?`) | `7135399` |
| E | Tela "Confirme seu email" no signup | `7135399` |
| I | Recorrências (template + cron + UI `/recurring`) | Não commitado ainda |

### Detalhes Recorrências (I)
- Migration: `supabase/migrations/0009_recurring.sql`
- Tabela `recurring_transactions` (template) + enum `recurring_frequency` (daily/weekly/monthly/yearly)
- Cron: `/api/cron/recurring` agendado `5 3 * * *` (todo dia 00:05 SP)
- UI: página `/recurring` (lista + criar + pausar + retomar + excluir)
- Nav: novo item "Recorrências" com atalho `g+e`

---

## 4. Backlog (ordenado por custo/benefício)

| # | Melhoria | Token | Dificuldade | Ação manual | Valor |
|---|---|---|---|---|---|
| F | Transferência entre contas (sem virar receita+gasto duplicado) | Médio | Médio | Migration | Alto |
| G | Tags livres em transação | Médio | Médio | Migration | Alto |
| H | Split de transação (1 lançamento em N) | Médio | Médio | Migration | Médio |
| J | Anexar comprovante (foto NF) | Médio | Médio | Criar bucket Supabase Storage | Alto |
| K | Metas de economia | Médio | Médio | Migration | Médio |
| M | Export PDF/Excel do mês | Médio-alto | Médio | — | Médio |
| N | Voz no Telegram (áudio → transação via IA) | Médio-alto | Médio-difícil | — | Alto |
| O | Dashboard cartão (fatura, fechamento, limite) | Médio-alto | Médio | Talvez migration | Alto |
| P | Web Push PWA (notificações no navegador/celular) | Alto | Difícil | Gerar VAPID keys | Médio |

### Possibilidades futuras (não dimensionadas)
- Importação OFX direto do banco (já tem PDF/CSV)
- Open Finance / sync automático com banco (Belvo/Pluggy)
- Compartilhamento parcial (membro vê só categorias X)
- Compactação de transações antigas (Big Object Salesforce-style)
- Multi-moeda + cotação histórica

---

## 5. Já existente que descobrimos no caminho

Pra evitar reimplementar, fica registrado o que já tem no app hoje:

- ✅ Onboarding pós-signup (rota `/onboarding` + API)
- ✅ Importação OFX/CSV/PDF + categorização IA (rota `/import` + 4 endpoints `/api/import/*`)
- ✅ Orçamento / Alertas (tabela `alerts` + rota `/alerts` + cron `/api/cron/alerts` rodando `0 11 * * *`)
- ✅ Audit log (tabela `audit_log`)
- ✅ Agente IA proativo (6 endpoints: chat, parse, obra-estimate, travel-suggest, car-tco, gift-suggest, edu-suggest)
- ✅ Módulos: car, gift, education, obra, travel, custom
- ✅ Bot Telegram + WhatsApp (rate limit, sessions, link via deep link)

---

## 6. Padrões e regras do projeto

### Stack
- Next.js (App Router, TS, RSC)
- Supabase (Auth, Postgres, RLS)
- Tailwind
- pnpm
- Deploy Vercel
- Bot Telegram (oficial) / WhatsApp Cloud API

### Convenções
- Migrations versionadas em `supabase/migrations/`
- Types do banco em `src/types/database.ts` (manualmente atualizado quando migration adiciona tabela/enum)
- Crons no `vercel.json` com `?secret=$CRON_SECRET`
- Server components leem dados; mutations via supabase browser client
- RLS sempre: `is_member_of(household_id)` ou `has_role_in(household_id, [...])`

### Workflow
- Commit do usuário (Lucas), Claude não commita sozinho
- Push pra `main` deploya prod na Vercel automaticamente
- Sem `.md` no projeto fora deste arquivo e do README
- Sem comentários em código salvo restrição não óbvia

---

## 7. Cron jobs ativos

| Schedule (UTC) | Path | O que faz |
|---|---|---|
| `0 11 * * *` (08h SP) | `/api/cron/alerts` | Avalia e dispara alertas (orçamento, fatura, recorrência simples) |
| `0 12 1 * *` (09h SP, dia 1) | `/api/cron/monthly-report` | Resumo mensal pelo Telegram |
| `5 3 * * *` (00:05 SP) | `/api/cron/recurring` | Materializa templates de recorrência em transações reais |

---

## 8. Variáveis de ambiente

### Públicas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME=ON WAY FINANCIAL`

### Servidor
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`
- `CRON_SECRET`
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME` + `TELEGRAM_WEBHOOK_SECRET`
- `WHATSAPP_*` (opcional)
- `RESEND_API_KEY` + `INVITE_FROM_EMAIL` + `INVITE_REPLY_TO` (novo)
