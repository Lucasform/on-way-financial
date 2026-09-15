-- =========================
-- 0010_obra_focus.sql
-- Pivot: app 100% focado em finanças de obra. Fornecedores, catálogo de
-- material e cotações (comparação de preço). Remove módulos não-obra.
-- =========================

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text check (category in ('material','mão-de-obra','equipamento','serviço','outro')),
  phone text,
  notes text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger suppliers_updated_at before update on suppliers
for each row execute function set_updated_at();
create index on suppliers (household_id);

create table if not exists material_types (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  unit text not null default 'un',
  category text,
  created_at timestamptz not null default now()
);
create index on material_types (household_id);

create table if not exists price_quotes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  material_type_id uuid references material_types(id) on delete set null,
  item_name text not null,
  unit text not null default 'un',
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quoted_at date not null default current_date,
  valid_until date,
  notes text,
  created_at timestamptz not null default now()
);
create index on price_quotes (household_id);
create index on price_quotes (supplier_id);
create index on price_quotes (material_type_id);

alter table obra_items
  add column if not exists supplier_id uuid references suppliers(id) on delete set null,
  add column if not exists material_type_id uuid references material_types(id) on delete set null,
  add column if not exists expected_date date;

alter table suppliers enable row level security;
alter table material_types enable row level security;
alter table price_quotes enable row level security;

create policy "members read suppliers" on suppliers
  for select using (is_member_of(household_id));
create policy "owner/admin write suppliers" on suppliers
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

create policy "members read material_types" on material_types
  for select using (is_member_of(household_id));
create policy "owner/admin write material_types" on material_types
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

create policy "members read price_quotes" on price_quotes
  for select using (is_member_of(household_id));
create policy "owner/admin write price_quotes" on price_quotes
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));
