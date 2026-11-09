-- Conversas do WhatsApp dentro do app (Evolution API, mesmo padrão do Magen, sem bot).
-- Cada obra conecta o próprio celular (uma instância no servidor Evolution por obra).
-- Só entram no app as conversas que o usuário escolher; mensagem de quem não está aqui é ignorada.
-- Leitura pelos membros da obra (RLS); escrita só pelo servidor (service role), depois das checagens nas rotas.

create table public.wa_connections (
  household_id uuid primary key references public.households (id) on delete cascade,
  instance_name text not null unique,
  webhook_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status text not null default 'disconnected' check (status in ('disconnected', 'connecting', 'connected')),
  updated_at timestamptz not null default now()
);

create table public.wa_conversations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- número com DDI, ou "lid:<código>" quando o WhatsApp esconde o número
  phone text not null,
  wa_jid text,
  contact_name text,
  supplier_id uuid references public.suppliers (id) on delete set null,
  last_message text,
  last_message_at timestamptz,
  unread integer not null default 0,
  history_imported boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, phone)
);
create index wa_conversations_list_idx on public.wa_conversations (household_id, last_message_at desc nulls last);
create index wa_conversations_jid_idx on public.wa_conversations (household_id, wa_jid);

create table public.wa_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  conversation_id uuid not null references public.wa_conversations (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  content text not null,
  wa_message_id text,
  created_at timestamptz not null default now(),
  unique (conversation_id, wa_message_id)
);
create index wa_messages_thread_idx on public.wa_messages (conversation_id, created_at);

alter table public.wa_connections enable row level security;
alter table public.wa_connections force row level security;
alter table public.wa_conversations enable row level security;
alter table public.wa_conversations force row level security;
alter table public.wa_messages enable row level security;
alter table public.wa_messages force row level security;

-- wa_connections guarda o segredo do webhook: sem policy, só o servidor lê.
create policy "members read wa_conversations" on public.wa_conversations
  for select using (is_member_of(household_id));
create policy "members read wa_messages" on public.wa_messages
  for select using (is_member_of(household_id));
