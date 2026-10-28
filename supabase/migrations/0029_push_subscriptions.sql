-- Aparelhos que aceitaram receber notificação (Web Push) do aviso diário.
-- Escrita e leitura só pelo servidor (service role), via /api/push/subscription e o cron.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
