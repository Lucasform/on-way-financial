# ADR 0001 — Arquitetura de fundação (On Way Financial)

Status: aceito · Data: 2026-06-23

Registro das decisões de arquitetura já tomadas. Append-only: novas decisões entram
como ADR 0002, etc. Replica o padrão de ADRs do On Education.

## Contexto

App de gestão financeira pessoal e empresarial, com lançamento rápido por bot
(WhatsApp/Telegram) e parsing por IA. Foco em clareza de caixa, não em contabilidade fiscal.

## Decisões

1. **Stack:** Next.js (App Router) + TypeScript, Supabase (Postgres, Auth, RLS),
   Tailwind, deploy Vercel (região gru1), pnpm.
   *Por quê:* SSR/rotas de API no mesmo projeto, backend único, baixo custo.

2. **Multi-conta por `household_id` + RLS.** Dados de negócio pertencem a um household;
   isolamento por RLS via helper `is_member(household_id)`.
   *Consequência:* compartilhamento família/sócio com isolamento garantido.

3. **Ingestão unificada.** `ingestMessage(channel, sender, text)` é reusada pelos
   webhooks de Telegram e Evolution (WhatsApp). Parsing por IA (Anthropic, Haiku)
   roda no servidor e devolve estrutura.
   *Consequência:* um só caminho de ingestão para vários canais.

4. **Segredos só no servidor.** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
   `EVOLUTION_API_KEY` em rotas server-side (`lib/supabase/admin.ts`), nunca no client.

5. **Acesso LITERAL a `NEXT_PUBLIC_*`.** Nunca ler `process.env[nome]` dinâmico no
   client (o Next não injeta no bundle e quebra todas as telas). Lição já aprendida.

## Consequências gerais

- Acoplamento ao Supabase (trade-off pela velocidade).
- Sem testes automatizados ainda (dívida registrada em MVP-PROCESSO.md).
- Novas decisões relevantes viram ADR aqui.
