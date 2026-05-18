# 🏦 ON WAY FINANCIAL — Guia passo a passo (VS Code + Claude Code)

> **Como usar este guia:** você está dentro do VS Code com o Claude Code aberto e o projeto **on-way-financial** já gerado. A partir daqui o fluxo é: cada passo diz exatamente **o que digitar no chat do Claude Code** (que eu, Claude, executo no terminal e nos arquivos) e o que ainda exige uma aba do navegador. Sempre que aparecer 🌐 → ação no navegador. Sempre que aparecer 💬 → diga no chat e eu faço.
>
> Versão 2.0 · adaptada para fluxo **100% in-VSCode**.

---

## 📋 Sumário

1. [Visão geral](#1-visão-geral)
2. [Pré-requisitos (contas + ferramentas)](#2-pré-requisitos)
3. [Passo 1 — Preparar a máquina (verificações)](#passo-1)
4. [Passo 2 — Criar repositório GitHub](#passo-2)
5. [Passo 3 — Criar projeto no Supabase](#passo-3)
6. [Passo 4 — App no Meta (WhatsApp Cloud API)](#passo-4)
7. [Passo 5 — Chave da Anthropic](#passo-5)
8. [Passo 6 — Conta na Vercel](#passo-6)
9. [Passo 7 — Configurar `.env.local`](#passo-7)
10. [Passo 8 — Subir migrações do Supabase](#passo-8)
11. [Passo 9 — Rodar localmente](#passo-9)
12. [Passo 10 — Deploy na Vercel](#passo-10)
13. [Passo 11 — Plugar webhook do WhatsApp](#passo-11)
14. [Passo 12 — Smoke test ponta a ponta](#passo-12)
15. [Custos esperados](#custos)
16. [Backup, segurança e LGPD](#backup-seguranca)
17. [Troubleshooting](#troubleshooting)
18. [Próximos passos](#proximos-passos)

---

## 1. Visão geral

O código **já foi gerado** pelo Claude Code (96 arquivos em `on-way-financial/`). Falta:

1. Criar contas externas (GitHub, Supabase, Meta, Anthropic, Vercel) — **só o que não dá pra fazer em CLI**.
2. Coletar as chaves dessas contas → colar no `.env.local`.
3. Subir o banco (`supabase db push`).
4. Rodar local (`pnpm dev`).
5. Push pra GitHub → Vercel detecta e deploya.
6. Plugar o webhook do WhatsApp na URL da Vercel.

Tempo estimado: **2 a 4 horas** na primeira execução.

---

## 2. Pré-requisitos

### Contas que você vai criar (todas grátis no início)

| Serviço | Pra quê |
|---|---|
| **GitHub** | Repositório + CI/CD |
| **Supabase** | Postgres + Auth + Storage + Edge Functions |
| **Vercel** | Hospedagem Next.js (Hobby grátis) |
| **Meta for Developers** | WhatsApp Cloud API |
| **Anthropic Console** | Chave da Claude API |
| **Google** (opcional) | Login social |

### Ferramentas locais

Vou checar isso no Passo 1. Você precisa de: **Node 20+**, **pnpm**, **git**, **VS Code** (você já está aqui), **Supabase CLI**, **Claude Code** (você está usando agora).

> 💡 **Extensões VS Code recomendadas** (instale pela aba Extensions):
> - **Supabase** (oficial) — explora o schema sem sair do editor.
> - **VSCode Vercel** (kyswtn) — vê deploys e logs.
> - **Tailwind CSS IntelliSense** — autocomplete das classes.
> - **ESLint** e **Prettier** — já configurados no projeto.

---

<a id="passo-1"></a>
## Passo 1 — Preparar a máquina (verificações)

💬 **Diga no chat:**
> "Cheque se tenho Node 20+, pnpm, git e Supabase CLI instalados, e me diga o que falta."

Eu vou rodar:
```powershell
node --version    # esperado: v20.x ou maior
pnpm --version    # se faltar: npm i -g pnpm
git --version
supabase --version  # se faltar: npm i -g supabase
```

Se algo faltar, eu instalo com seu OK. Não rode comandos sem antes me pedir aqui — assim você acompanha o que está acontecendo.

---

<a id="passo-2"></a>
## Passo 2 — Criar repositório GitHub

### 🌐 No navegador

1. Acesse **https://github.com/new**
2. Repository name: `on-way-financial`
3. **Private** (recomendado)
4. **NÃO marque** "Initialize with README"
5. Clique **Create repository**
6. Copie a URL SSH (`git@github.com:SEUUSER/on-way-financial.git`)

### 💬 No chat

> "Inicialize o git, faça primeiro commit e configure o remote com a URL `git@github.com:SEUUSER/on-way-financial.git`"

Eu executo:
```powershell
git init
git add .
git commit -m "feat: bootstrap inicial do ON WAY FINANCIAL"
git branch -M main
git remote add origin git@github.com:SEUUSER/on-way-financial.git
# Não faço push ainda — só depois das envs configuradas.
```

> ⚠️ **Mantenha o repositório PRIVADO** durante o desenvolvimento. As migrations referenciam estruturas internas; não tem motivo pra deixar público.

---

<a id="passo-3"></a>
## Passo 3 — Criar projeto no Supabase

### 🌐 No navegador

1. Acesse **https://supabase.com** → login (use GitHub OAuth).
2. **New project**
3. Project name: `on-way-financial`
4. Database password: **gere senha forte de 32+ caracteres e salve no gerenciador**.
5. Region: **South America (São Paulo) sa-east-1**
6. Plan: **Free**
7. Create → aguarde 1–2 min.

### Coletar 4 valores

No painel do projeto:

- **Project Settings → API**
  - `Project URL` → vai virar `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` → vai virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` → vai virar `SUPABASE_SERVICE_ROLE_KEY` (⚠️ **nunca no client**)
- **Project Settings → General**
  - `Reference ID` → vai virar seu `PROJECT_REF` (precisa pro `supabase link`)

### Habilitar Auth providers

- **Authentication → Providers → Email** → habilitar "Magic Link".
- **Authentication → Providers → Google** → habilitar (pode deixar pra depois).
- **Authentication → URL Configuration**
  - Site URL: `http://localhost:3000` (por enquanto)
  - Redirect URLs: adicionar `http://localhost:3000/auth/callback`

> 🟢 **Storage buckets** não precisa criar manualmente — a migration `0004_seed.sql` já cria `receipts` e `obra-gallery` com policies por household.

---

<a id="passo-4"></a>
## Passo 4 — App no Meta (WhatsApp Cloud API)

### 🌐 No navegador

1. **https://developers.facebook.com** → login com Facebook.
2. **My Apps → Create App** → tipo **Business** → Next.
3. Display name: `ON WAY FINANCIAL` · Contact email: seu email → Next.
4. Role até **WhatsApp** → **Set up**.
5. Selecione ou crie uma Business Account (ex.: "ON WAY").
6. Em **Quickstart** o Meta gera um **Phone Number ID** de teste e um **Test number** com 5 mensagens grátis.
7. Adicione **seu próprio número** em **To phone numbers → Add phone number** (para receber mensagens de teste).

### Anote (vai pro `.env.local` depois)

- `Phone Number ID` → `WHATSAPP_PHONE_NUMBER_ID`
- `WhatsApp Business Account ID` → `WHATSAPP_BUSINESS_ACCOUNT_ID`
- **Access Token temporário** (24h) — serve só pra teste rápido. Pra produção: gere um permanente abaixo.

### Token permanente (System User)

1. **https://business.facebook.com/settings** → **Users → System Users → Add**
2. Nome: `onway-bot` · role: **Admin**
3. **Assigned Assets** → adicione o app WhatsApp com **Full control**
4. **Generate new token** → selecione o app → permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Expiração: **Never**
6. Copie o token → vai virar `WHATSAPP_ACCESS_TOKEN`

### App Secret

- **App Settings → Basic** → copie o **App Secret** → vai virar `WHATSAPP_APP_SECRET`

### Verify Token (você inventa)

💬 **Diga no chat:**
> "Gera dois segredos aleatórios pra mim: um pro WHATSAPP_VERIFY_TOKEN e outro pro CRON_SECRET."

Eu rodo:
```powershell
node -e "console.log('WHATSAPP_VERIFY_TOKEN=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ Salve esses dois valores agora — vamos usar no `.env.local` e no painel do Meta.

---

<a id="passo-5"></a>
## Passo 5 — Chave da Anthropic

### 🌐 No navegador

1. **https://console.anthropic.com** → crie conta.
2. **Settings → API Keys → Create Key** · nome: `on-way-financial-prod`.
3. Copie a chave (`sk-ant-...`) — ela só aparece uma vez. → vai virar `ANTHROPIC_API_KEY`
4. **Plan & Billing → Spend limits** → defina **USD 5/mês** pra dormir tranquilo.

> 💰 Custo realista: ~USD 0,10/mês pra ~200 mensagens com Haiku 4.5.

---

<a id="passo-6"></a>
## Passo 6 — Conta na Vercel

### 🌐 No navegador

1. **https://vercel.com** → login com GitHub.
2. **NÃO clique em "Add New Project" ainda** — você só vai fazer isso depois de configurar `.env.local` e ter o push no GitHub (Passo 10).
3. Confirme que está no **Hobby (free)**.

---

<a id="passo-7"></a>
## Passo 7 — Configurar `.env.local`

Agora você tem **todos os valores** dos passos 3, 4 e 5. Hora de colar.

💬 **Diga no chat:**
> "Cria o `.env.local` baseado no `.env.local.example` e me diga onde colar cada valor."

Eu vou:
1. Copiar `.env.local.example` → `.env.local`
2. Abrir o arquivo no editor pra você preencher.

Ou você abre direto: [.env.local.example](.env.local.example) → salve como `.env.local` e preencha:

```bash
# ===== Supabase (Passo 3) =====
NEXT_PUBLIC_SUPABASE_URL="https://SEUPROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# ===== App =====
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ON WAY FINANCIAL"

# ===== WhatsApp (Passo 4) =====
WHATSAPP_PHONE_NUMBER_ID="..."
WHATSAPP_BUSINESS_ACCOUNT_ID="..."
WHATSAPP_ACCESS_TOKEN="EAAG..."
WHATSAPP_VERIFY_TOKEN="..."   # o que geramos
WHATSAPP_APP_SECRET="..."

# ===== Anthropic (Passo 5) =====
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-haiku-4-5-20251001"

# ===== Cron =====
CRON_SECRET="..."   # o outro segredo que geramos
```

> 🚨 **NUNCA commitar `.env.local`.** Já está no `.gitignore`. Se vazar: **revogue tudo imediatamente** (token Meta, anon/service Supabase, Anthropic).

---

<a id="passo-8"></a>
## Passo 8 — Subir migrações do Supabase

💬 **Diga no chat:**
> "Faça login na Supabase CLI, linke o projeto com ref `SEU_PROJECT_REF` (do Passo 3) e suba as 4 migrations."

Eu executo:
```powershell
supabase login                              # abre browser pra OAuth
supabase link --project-ref SEU_PROJECT_REF
supabase db push                            # aplica 0001 → 0004
pnpm db:types                               # regenera src/types/database.ts
```

**Validar:** abra a extensão **Supabase** no VS Code (sidebar) → você deve ver as tabelas `households`, `transactions`, `modules`, etc.

> 🛠️ **Se algo falhar**, leia o output no terminal — geralmente é falta de permissão, senha errada ou region diferente do que está em `supabase/config.toml`.

---

<a id="passo-9"></a>
## Passo 9 — Rodar localmente

💬 **Diga no chat:**
> "Instale as deps, rode typecheck, lint, testes e sobe o dev server."

Eu executo:
```powershell
pnpm install
pnpm typecheck
pnpm lint
pnpm test           # vitest unit
pnpm dev            # http://localhost:3000
```

### ✅ Checklist do teste local

Abra **http://localhost:3000** no Chrome:

- [ ] Landing carrega sem erros (console F12 limpo)
- [ ] Clica em "Entrar com email" → recebe magic link no email
- [ ] Clica no link → cai no onboarding
- [ ] Cria a família "Família" → vai pro Overview
- [ ] Vai em **Transações → Nova** → cria despesa R$ 50 PIX Mercado
- [ ] Despesa aparece no Overview
- [ ] Testa dark/light em **Configurações**
- [ ] Console (F12) sem erros vermelhos

> 🐛 Se travar: pergunta aqui que eu te ajudo a debugar com base nos logs.

---

<a id="passo-10"></a>
## Passo 10 — Deploy na Vercel

### 💬 No chat

> "Faça commit e push para o GitHub."

Eu executo:
```powershell
git add .
git commit -m "feat: configuração inicial pronta para deploy"
git push -u origin main
```

### 🌐 No navegador

1. **https://vercel.com/new** → selecione o repo `on-way-financial`.
2. Framework Preset: **Next.js** (auto-detectado).
3. **Environment Variables** → cole **todas** as do `.env.local`, **mudando** apenas:
   - `NEXT_PUBLIC_APP_URL` → `https://onway-financial.vercel.app` (ou seu domínio final)
4. **Deploy** → 2–4 minutos.
5. Copie a URL final.

### Voltar no Supabase

🌐 **Authentication → URL Configuration:**

- **Site URL** → `https://onway-financial.vercel.app`
- **Redirect URLs** → adicione `https://onway-financial.vercel.app/auth/callback`

### Cron já está pronto

O `vercel.json` já tem:
```json
{ "crons": [{ "path": "/api/cron/alerts?secret=$CRON_SECRET", "schedule": "0 11 * * *" }] }
```
Vercel detecta automático no deploy. Validar em **Project → Settings → Cron Jobs**.

---

<a id="passo-11"></a>
## Passo 11 — Plugar webhook do WhatsApp

### 🌐 No painel do Meta

1. **WhatsApp → Configuration → Webhook → Edit**
2. **Callback URL:** `https://onway-financial.vercel.app/api/whatsapp/webhook`
3. **Verify Token:** o **mesmo** valor que você botou em `WHATSAPP_VERIFY_TOKEN`
4. **Verify and Save** → se der erro, confira que o deploy está no ar e responda 200 a `GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEUTOKEN&hub.challenge=teste`
5. **Webhook fields → Manage** → assine `messages` (obrigatório). Opcional: `message_template_status_update`.

### Vincular seu telefone à conta

No app deployado: **Configurações → seu WhatsApp** → digite seu número em E.164 (ex.: `+5511999999999`) → salvar.

> Sem isso, o bot responde "Olá! Esse número não está vinculado a nenhuma conta."

---

<a id="passo-12"></a>
## Passo 12 — Smoke test ponta a ponta

Sequência completa que precisa funcionar:

- [ ] Abrir o app em produção pelo celular
- [ ] Login por magic link no celular
- [ ] Ver Overview com sua família
- [ ] Adicionar despesa pela UI (R$ 50 em Mercado, hoje, PIX)
- [ ] Mandar no WhatsApp: `/despesa 30 café @pix` → receber confirmação
- [ ] Mandar: `gastei 80 reais no posto ontem credito` → receber confirmação com categoria sugerida (Transporte)
- [ ] As 3 despesas aparecem em **Transações** e no **Overview**
- [ ] Criar módulo **Obra** "Reforma teste", adicionar 2 fases, anexar 1 foto
- [ ] Mandar mensagem para um worker fictício (use seu número) → você recebe no WhatsApp
- [ ] Criar alerta "Mercado > R$ 100" → quando ultrapassar, cron dispara WhatsApp na próxima madrugada (08:00 BRT)

💬 Se algum desses falhar, copie o erro aqui que eu te ajudo.

---

<a id="custos"></a>
## 💰 Custos esperados

| Serviço | Free tier | Quando começa a cobrar |
|---|---|---|
| Vercel Hobby | 100 GB-h função/mês, 100 GB banda | Apenas em uso pesado |
| Supabase Free | 500 MB DB, 1 GB Storage, 50k MAU, 2 GB egress | Apenas com crescimento |
| WhatsApp Cloud API | 1.000 conversas user-initiated/mês | ~USD 0,005–0,08 por conversa extra (varia por país) |
| Anthropic API | Sem free tier eterno | Haiku 4.5 ~ USD 1 / 1M tokens entrada |
| GitHub Free | Repos privados ilimitados | Plano Pro só se precisar de Actions extras |

**Estimativa realista** (família com ~200 msgs/mês usando IA):
- WhatsApp: **USD 0** (dentro do free)
- Anthropic: **~USD 0,10/mês**
- Vercel + Supabase + GitHub: **USD 0** no MVP

Total: **centavos por mês** no início.

---

<a id="backup-seguranca"></a>
## 🔐 Backup, segurança e LGPD

### Backup

- Supabase Free faz **backup diário automático** (PITR só em plano pago).
- Dump manual semanal:
  💬 *"Roda dump do banco e salva em `backups/$(date).sql`"*
  ```powershell
  supabase db dump --linked > "backups/$(Get-Date -Format yyyy-MM-dd).sql"
  ```
- Guarde os 4 últimos dumps num drive privado.

### Checklist de segurança

- [x] RLS habilitada em todas as tabelas (validado nas migrations)
- [x] Service Role Key só em rotas server (`src/lib/supabase/admin.ts` tem `"server-only"`)
- [x] HMAC validado no webhook (`crypto.timingSafeEqual`)
- [x] `CRON_SECRET` checado em `/api/cron/*`
- [ ] Senha forte no Supabase (você define)
- [ ] **2FA ativado** em GitHub, Vercel, Meta, Anthropic, Supabase

### LGPD

- Termos de Uso + Política de Privacidade na landing **antes** de convidar terceiros.
- Botão de **Exportar CSV** já está em `/settings`.
- Botão de **Apagar conta** (soft delete + 30 dias) → ainda não implementado, é uma boa próxima feature.
- Tabela `audit_log` já existe no schema.

---

<a id="troubleshooting"></a>
## 🛠️ Troubleshooting

### Webhook do WhatsApp não verifica

1. Confirme que o deploy está no ar: `curl https://SEUDOMINIO/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEUTOKEN&hub.challenge=ok` → deve retornar `ok`.
2. `WHATSAPP_VERIFY_TOKEN` no `.env` da Vercel = **exatamente** o mesmo do painel Meta?
3. **Logs:** Vercel → Project → Logs → filtre por `/api/whatsapp/webhook`.

### Mensagens chegam mas não criam transação

1. Seu número está em `household_members.whatsapp_phone` no formato **E.164** (`+5511999999999`)?
   💬 *"Roda um SELECT em household_members pra ver os números cadastrados."*
2. Logs do POST: erro do parser? Anthropic falhou?
3. Teste o parser direto:
   ```powershell
   curl -X POST https://SEUDOMINIO/api/ai/parse -H "content-type: application/json" -d '{"text":"gastei 50 no mercado"}'
   ```
   (Requer estar logado — use a versão local primeiro: `http://localhost:3000`)

### Erro 401 em RLS no Supabase

1. Logado? Cheque cookies `sb-*` no DevTools → Application.
2. Policy existe? No SQL Editor: `SELECT * FROM pg_policies WHERE schemaname='public';`
3. Usuário em `household_members` com role apropriado?

### Build da Vercel falha

1. Rode `pnpm build` local antes do push.
2. **Todas** as 12 envs setadas na Vercel?
3. Node 20.x configurado no projeto Vercel (Settings → General → Node.js Version).

### WhatsApp banido ou suspenso

- Número usado em outra conta Business simultaneamente?
- Envio em volume sem template aprovado fora da janela de 24h?
- Pra alertas proativos fora da janela: crie um **Message Template** no Meta (aprovação 1–24h).

---

<a id="proximos-passos"></a>
## 🚀 Próximos passos (após v1.0)

- **v1.1** — OCR de comprovantes por foto (Claude Vision)
- **v1.2** — Open Finance (Pluggy/Belvo) → importar extratos automaticamente
- **v1.3** — App mobile nativo (Expo + React Native compartilhando backend)
- **v1.4** — Marketplace de templates de módulos ("Casamento", "Mudança internacional")
- **v1.5** — Bot pró-ativo: resumo diário no WhatsApp perguntando se há algo a registrar

---

## 📞 Como pedir ajuda dentro do Claude Code

Quando travar em qualquer passo:

1. **Copie o erro completo** (terminal ou navegador)
2. Cole aqui no chat com o contexto do passo (ex.: "travei no Passo 8")
3. Eu vou:
   - Ler o erro
   - Olhar o arquivo/log relevante
   - Sugerir correção ou aplicar direto se você autorizar

Comandos úteis para me ajudar a te ajudar:
- *"Mostra os últimos 50 logs do dev server"*
- *"Lê o erro de build da Vercel da última run"*
- *"Roda um SELECT em [tabela] pra eu ver os dados"*
- *"Testa o webhook localmente com curl"*

---

Boa construção. Você é o piloto, eu (Claude Code) sou o copiloto, o Supabase é o banco que nunca dorme. 🚀
