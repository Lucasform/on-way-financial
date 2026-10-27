-- Cotação passa por: em aberto -> em execução (pagamento parcial/agendado) -> aceita (quitada).
alter table public.price_quotes
  add column if not exists execution_started_at timestamptz,
  add column if not exists total_amount numeric(14, 2);

-- Pagamentos de uma cotação em execução. paid_at nulo = agendado; pago gera um custo (item_id).
create table public.quote_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  quote_id uuid not null references public.price_quotes(id) on delete cascade,
  label text not null,
  amount numeric(14, 2) not null check (amount > 0),
  due_date date,
  paid_at date,
  item_id uuid references public.obra_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index quote_payments_quote_id_idx on public.quote_payments (quote_id);
create index quote_payments_due_idx on public.quote_payments (household_id, due_date) where paid_at is null;
create index quote_payments_item_id_idx on public.quote_payments (item_id);

alter table public.quote_payments enable row level security;
alter table public.quote_payments force row level security;

create policy "members read quote_payments" on public.quote_payments
  for select using (is_member_of(household_id));
create policy "owner/admin insert quote_payments" on public.quote_payments
  for insert with check (has_role_in(household_id, array['owner'::household_role, 'admin'::household_role]));
create policy "owner/admin update quote_payments" on public.quote_payments
  for update using (has_role_in(household_id, array['owner'::household_role, 'admin'::household_role]))
  with check (has_role_in(household_id, array['owner'::household_role, 'admin'::household_role]));
create policy "owner/admin delete quote_payments" on public.quote_payments
  for delete using (has_role_in(household_id, array['owner'::household_role, 'admin'::household_role]));
