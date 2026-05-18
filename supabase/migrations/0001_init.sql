-- =========================
-- 0001_init.sql
-- Schema inicial: households, members, categorias, métodos de pagamento,
-- transações, alertas, whatsapp sessions, rate limit e audit log.
-- =========================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ----- updated_at helper -----
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- HOUSEHOLDS & MEMBERS
-- =========================
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger households_updated_at
before update on households
for each row execute function set_updated_at();

create type household_role as enum ('owner', 'admin', 'viewer');

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role household_role not null default 'viewer',
  display_name text,
  whatsapp_phone text,
  created_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (whatsapp_phone)
);

create index on household_members (user_id);
create index on household_members (whatsapp_phone);

create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text,
  role household_role not null default 'viewer',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index on household_invites (household_id);
create index on household_invites (email);

-- =========================
-- CATEGORIES
-- =========================
create type tx_type as enum ('expense', 'income', 'transfer');

create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  type tx_type not null default 'expense',
  icon text,
  color text,
  parent_id uuid references categories(id) on delete set null,
  is_system boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index on categories (household_id);
create index on categories (household_id, parent_id);

-- =========================
-- PAYMENT METHODS
-- =========================
create type payment_kind as enum (
  'cash','pix','debit_card','credit_card','bank_transfer','boleto','meal_voucher','other'
);

create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  kind payment_kind not null,
  last_four text,
  brand text,
  credit_limit numeric(12,2),
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index on payment_methods (household_id);

-- =========================
-- TRANSACTIONS
-- =========================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  type tx_type not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  occurred_at date not null default current_date,
  category_id uuid references categories(id) on delete set null,
  payment_method_id uuid references payment_methods(id) on delete set null,
  module_kind text,
  module_id uuid,
  installments_total smallint check (installments_total is null or installments_total >= 1),
  installment_number smallint check (installment_number is null or installment_number >= 1),
  installments_group_id uuid,
  receipt_url text,
  notes text,
  source text not null default 'web' check (source in ('web','whatsapp','import')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger transactions_updated_at
before update on transactions
for each row execute function set_updated_at();

create index on transactions (household_id, occurred_at desc);
create index on transactions (household_id, category_id);
create index on transactions (household_id, payment_method_id);
create index on transactions (household_id, module_kind, module_id);
create index on transactions (installments_group_id);

-- =========================
-- ALERTS
-- =========================
create type alert_kind as enum (
  'budget_exceeded','category_threshold','large_expense',
  'recurring_due','invoice_closing','goal_progress','custom'
);

create type alert_frequency as enum ('immediate','daily','weekly');

create table alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  kind alert_kind not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  channels jsonb not null default '["whatsapp"]'::jsonb,
  target_member_ids uuid[] not null default '{}',
  frequency alert_frequency not null default 'immediate',
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger alerts_updated_at
before update on alerts
for each row execute function set_updated_at();

create index on alerts (household_id, active);

-- =========================
-- WHATSAPP SESSIONS & RATE LIMIT
-- =========================
create table whatsapp_sessions (
  phone text primary key,
  member_id uuid references household_members(id) on delete set null,
  household_id uuid references households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now()
);

create table whatsapp_rate_limit (
  phone text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (phone, window_start)
);

create index on whatsapp_rate_limit (window_start);

-- =========================
-- AUDIT LOG
-- =========================
create table audit_log (
  id bigint generated always as identity primary key,
  household_id uuid,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index on audit_log (household_id, created_at desc);
