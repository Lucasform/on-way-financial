-- On Way Financial — schema inicial
-- Multi-tenant por household, RLS por membership. Finanças + Obra + Ingestão (IA/WhatsApp/Telegram).

create extension if not exists "pgcrypto";

-- ───────────────────────── Households & membros ─────────────────────────
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'BRL',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member','viewer')),
  display_name text,
  telegram_chat_id text,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index on household_members(user_id);
create index on household_members(telegram_chat_id);
create index on household_members(whatsapp_number);

-- helper: o usuário atual participa do household?
create or replace function is_member(h uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from household_members m
    where m.household_id = h and m.user_id = auth.uid()
  );
$$;

-- ───────────────────────── Contas & conexões bancárias ─────────────────────────
create table accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  type text not null default 'checking' check (type in ('checking','savings','wallet','credit_card','investment','cash')),
  institution text,
  color text default '#6366f1',
  opening_balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2),
  closing_day int,
  due_day int,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on accounts(household_id);

-- credenciais de banco (cofre). Conteúdo cifrado pela app; nunca em texto puro.
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  provider text not null,                 -- ex: 'pluggy','belvo','manual_ofx','open_finance'
  status text not null default 'disconnected' check (status in ('disconnected','connected','error','syncing')),
  external_item_id text,
  credentials_encrypted text,             -- payload cifrado (AES-GCM via app)
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index on bank_connections(household_id);

-- ───────────────────────── Categorias ─────────────────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  kind text not null default 'expense' check (kind in ('income','expense')),
  color text default '#64748b',
  icon text default 'tag',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on categories(household_id);

-- ───────────────────────── Transações ─────────────────────────
create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  project_id uuid,                        -- FK p/ construction_projects (set abaixo)
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'BRL',
  description text,
  notes text,
  occurred_on date not null default current_date,
  transfer_account_id uuid references accounts(id) on delete set null,
  status text not null default 'cleared' check (status in ('pending','cleared','reconciled')),
  source text not null default 'manual' check (source in ('manual','ai','telegram','whatsapp','import','recurring')),
  external_id text,                       -- dedup p/ importação bancária
  attachment_url text,
  ai_confidence numeric(4,3),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on transactions(household_id, occurred_on desc);
create index on transactions(account_id);
create index on transactions(category_id);
create unique index on transactions(household_id, external_id) where external_id is not null;

-- ───────────────────────── Orçamentos, recorrências, metas ─────────────────────────
create table budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  period_month date not null,             -- primeiro dia do mês
  limit_amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (household_id, category_id, period_month)
);

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null,
  description text,
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','yearly')),
  day_of_month int,
  next_run date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  saved_amount numeric(14,2) not null default 0,
  target_date date,
  color text default '#22c55e',
  created_at timestamptz not null default now()
);

-- ───────────────────────── Obra (construção) ─────────────────────────
create table construction_projects (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  description text,
  address text,
  status text not null default 'planning' check (status in ('planning','in_progress','paused','done')),
  budget_total numeric(14,2) not null default 0,
  start_date date,
  expected_end_date date,
  cover_url text,
  created_at timestamptz not null default now()
);
create index on construction_projects(household_id);

alter table transactions
  add constraint transactions_project_fk
  foreign key (project_id) references construction_projects(id) on delete set null;

create table construction_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references construction_projects(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  status text not null default 'pending' check (status in ('pending','in_progress','done','blocked')),
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  budget_amount numeric(14,2) not null default 0,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);
create index on construction_phases(project_id);

-- itens de orçamento (material/mão de obra) por etapa
create table construction_budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references construction_projects(id) on delete cascade,
  phase_id uuid references construction_phases(id) on delete set null,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text default 'material' check (category in ('material','labor','equipment','service','other')),
  unit text,
  quantity numeric(12,3) not null default 1,
  unit_cost numeric(14,2) not null default 0,
  estimated_amount numeric(14,2) generated always as (quantity * unit_cost) stored,
  created_at timestamptz not null default now()
);
create index on construction_budget_items(project_id);

create table construction_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references construction_projects(id) on delete cascade,
  phase_id uuid references construction_phases(id) on delete set null,
  household_id uuid not null references households(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete set null,
  supplier text,
  description text not null,
  amount numeric(14,2) not null,
  paid boolean not null default false,
  occurred_on date not null default current_date,
  receipt_url text,
  created_at timestamptz not null default now()
);
create index on construction_expenses(project_id);

create table construction_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references construction_projects(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  kind text default 'other' check (kind in ('plan','contract','invoice','photo','permit','other')),
  file_url text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Inbox de ingestão (IA/chat) ─────────────────────────
create table ingest_inbox (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  channel text not null check (channel in ('telegram','whatsapp','ai_web')),
  sender text,                            -- chat_id / número
  raw_text text,
  media_url text,
  parsed jsonb,
  transaction_id uuid references transactions(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','parsed','confirmed','rejected','error')),
  created_at timestamptz not null default now()
);
create index on ingest_inbox(household_id, status);

-- ───────────────────────── RLS ─────────────────────────
alter table households enable row level security;
alter table household_members enable row level security;
alter table accounts enable row level security;
alter table bank_connections enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table recurring_rules enable row level security;
alter table goals enable row level security;
alter table construction_projects enable row level security;
alter table construction_phases enable row level security;
alter table construction_budget_items enable row level security;
alter table construction_expenses enable row level security;
alter table construction_documents enable row level security;
alter table ingest_inbox enable row level security;

create policy "households: ver" on households for select using (is_member(id));
create policy "households: criar" on households for insert with check (created_by = auth.uid());
create policy "households: dono atualiza" on households for update using (created_by = auth.uid());

create policy "members: ver" on household_members for select using (is_member(household_id));
create policy "members: self insert" on household_members for insert with check (user_id = auth.uid());
create policy "members: self update" on household_members for update using (user_id = auth.uid());

-- macro: tabelas filhas escopadas por household_id
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','bank_connections','categories','transactions','budgets',
    'recurring_rules','goals','construction_projects','construction_phases',
    'construction_budget_items','construction_expenses','construction_documents','ingest_inbox'
  ] loop
    execute format('create policy "%s: rw" on %I for all using (is_member(household_id)) with check (is_member(household_id));', t, t);
  end loop;
end $$;
