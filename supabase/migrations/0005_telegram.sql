-- =========================
-- 0005_telegram.sql
-- Suporte ao Telegram Bot:
--   - coluna telegram_chat_id em household_members (numérico do Telegram)
--   - tabela telegram_sessions (estado da conversa)
--   - tabela telegram_link_tokens (vincular conta via deep link /start <token>)
--   - tabela telegram_rate_limit
-- =========================

alter table household_members
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_username text;

create unique index if not exists household_members_telegram_chat_id_key
  on household_members (telegram_chat_id)
  where telegram_chat_id is not null;

create index if not exists household_members_telegram_username_idx
  on household_members (telegram_username);

create table if not exists telegram_sessions (
  chat_id bigint primary key,
  member_id uuid references household_members(id) on delete set null,
  household_id uuid references households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now()
);

create table if not exists telegram_link_tokens (
  token text primary key,
  member_id uuid not null references household_members(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_member_idx on telegram_link_tokens (member_id);

create table if not exists telegram_rate_limit (
  chat_id bigint not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (chat_id, window_start)
);

create index if not exists telegram_rate_limit_window_idx on telegram_rate_limit (window_start);

-- RLS: tudo via service_role (sem policies abertas)
alter table telegram_sessions enable row level security;
alter table telegram_link_tokens enable row level security;
alter table telegram_rate_limit enable row level security;

-- O proprietário do token pode ler seu próprio (útil pra debug em UI)
create policy "members read own link tokens" on telegram_link_tokens
  for select using (
    member_id in (
      select id from household_members where user_id = auth.uid()
    )
  );
