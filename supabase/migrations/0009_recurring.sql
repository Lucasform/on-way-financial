-- =========================
-- 0009_recurring.sql
-- Recorrências: templates que o cron materializa em transactions.
-- =========================

create type recurring_frequency as enum ('daily','weekly','monthly','yearly');

create table recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  type tx_type not null,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  category_id uuid references categories(id) on delete set null,
  payment_method_id uuid references payment_methods(id) on delete set null,
  notes text,
  frequency recurring_frequency not null,
  day_of_month smallint check (day_of_month between 1 and 31),
  day_of_week smallint check (day_of_week between 0 and 6),
  start_date date not null default current_date,
  end_date date,
  next_run date not null,
  last_run date,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recurring_transactions_updated_at
before update on recurring_transactions
for each row execute function set_updated_at();

create index on recurring_transactions (household_id, active);
create index on recurring_transactions (active, next_run);

-- RLS
alter table recurring_transactions enable row level security;

create policy "members read recurring" on recurring_transactions
  for select using (is_member_of(household_id));

create policy "owners/admins manage recurring" on recurring_transactions
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));
