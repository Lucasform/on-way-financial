# CLAUDE.md — On Way Financial (contexto técnico)

> Lido automaticamente pelo Claude Code a cada sessão. Define COMO o projeto é
> construído. O que e em que ordem construir está no `ROADMAP.md`.

---

## 1. Visão geral

**On Way Financial** é um app de gestão financeira pessoal e empresarial. Centraliza
contas, fluxo de caixa, categorização e relatórios, com lançamento rápido por bot
(Telegram / WhatsApp) e parsing por IA.

- Foco: clareza sobre o dinheiro (quanto tem, para onde vai), não contabilidade fiscal.
- Público: pessoas, autônomos e pequenas empresas.

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Estilo | Tailwind CSS |
| Backend / BD | Supabase (Postgres, Auth, RLS) |
| IA | Claude API (Haiku) para parsing de lançamento |
| Mensageria | Telegram Bot + Evolution API (WhatsApp) |
| Hospedagem | Vercel |
| Pacotes | pnpm |

**Não trocar de stack sem instrução explícita.**

## 3. Estrutura de pastas

```
src/
  app/         # rotas (App Router): áreas autenticadas + APIs (telegram, evolution, auth)
  components/  # UI, modais, charts, ingestão por IA
  lib/         # ai/, supabase/ (client + admin server-only), telegram/, evolution/, imports/
  types/       # tipos TypeScript
supabase/
  migrations/  # schema versionado (RLS por household)
```

## 4. Arquitetura

- **Multi-conta (household):** os dados de negócio pertencem a um `household_id`.
  RLS isola por household via função `is_member(household_id)`.
- **Segredos no servidor:** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
  `EVOLUTION_API_KEY` ficam SOMENTE em variáveis de ambiente / rotas server-side
  (`src/lib/supabase/admin.ts`). NUNCA no client nem no Git.
- **IA:** parsing de despesa/receita roda no servidor (Haiku), saída estruturada.
- **Mensageria:** webhooks em `src/app/api/telegram` e `src/app/api/evolution`.

## 5. Segurança (regras inegociáveis)

- `.env.local` no `.gitignore`. Versionar apenas `.env.example`.
- RLS ativo em toda tabela de negócio; meta: habilitar `FORCE ROW LEVEL SECURITY`.
- Service role só no servidor. Chave de IA e Evolution só no servidor.
- Validar entrada no client e no banco/rotas.

## 6. Convenções

- TypeScript em tudo, sem `any` sem justificativa.
- Textos de UI em PT-BR; nomes de código em inglês.
- Tratar loading e erro em toda chamada ao Supabase.
- Schema só via migration versionada, nunca "na mão".

## 7. Domínio do produto

Conhecimento de domínio (regras de finanças, edge cases, jargão) em [`DOMINIO.md`](DOMINIO.md).
Consultar antes de implementar lógica de lançamento, categorização ou relatório.

## 8. Ritual de pré-mortem / advogado do diabo (obrigatório)

Antes de qualquer mudança significativa (feature nova, mudança de schema, integração):

1. **Pré-mortem:** "estamos 6 meses no futuro e isso falhou. Quais as 3 causas mais prováveis?"
2. **Advogado do diabo:** pedir ao Claude para argumentar CONTRA a ideia e buscar
   evidência que a refute, não que a confirme. Postura padrão: cético.
3. **Premissas:** listar as 3 premissas de que a ideia mais depende. O que precisa
   ser verdade para cada uma? E se não for?
4. Só prosseguir se as respostas não derrubarem a ideia. Registrar a conclusão no
   `ROADMAP.md` ou no doc da decisão.

## 9. Fluxo de trabalho

- Uma etapa do `ROADMAP.md` por vez; confirmar escopo antes de codar.
- Fatias verticais testáveis; commit por bloco que funciona.
- Para ações que o Claude Code não executa sozinho (contas, navegador), parar e
  explicar o passo a passo manual.
