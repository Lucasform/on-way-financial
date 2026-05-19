-- =========================
-- 0006_obra_advanced.sql
-- Obra "construtora": itens detalhados, vídeos na galeria, diário, fornecedores.
-- =========================

-- Suporte a vídeos: adicionar tipo de mídia e duração na galeria.
alter table obra_gallery
  add column if not exists media_type text not null default 'image' check (media_type in ('image','video')),
  add column if not exists duration_seconds integer,
  add column if not exists thumbnail_url text;

-- Itens detalhados de material/serviço por fase
-- (ex.: 100 sacos de cimento R$ 30 = R$ 3000 — fase Estrutura)
create table if not exists obra_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  phase_id uuid references obra_phases(id) on delete set null,
  category text not null,        -- 'material' | 'mão-de-obra' | 'equipamento' | 'serviço'
  name text not null,            -- "Cimento CP-II 50kg"
  brand text,                    -- "Votoran"
  supplier text,                 -- "Leroy Merlin", "Casa do construtor"
  unit text not null default 'un', -- 'un' | 'm' | 'm2' | 'm3' | 'kg' | 'saco' | 'litro'
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_price numeric(12,2),      -- preço por unidade planejado
  actual_unit_price numeric(12,2), -- preço efetivo
  status text not null default 'planned' check (status in ('planned','ordered','bought','installed','cancelled')),
  bought_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger obra_items_updated_at before update on obra_items
for each row execute function set_updated_at();

create index if not exists obra_items_module_idx on obra_items (module_id);
create index if not exists obra_items_phase_idx on obra_items (phase_id);
create index if not exists obra_items_status_idx on obra_items (module_id, status);

-- Diário: registro do dia (texto + clima, podendo apontar fase)
create table if not exists obra_diary (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  phase_id uuid references obra_phases(id) on delete set null,
  entry_date date not null default current_date,
  weather text,                  -- 'sunny','rain','cloudy','storm'
  body text not null,
  workers_count smallint,
  hours_worked numeric(5,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists obra_diary_module_date_idx on obra_diary (module_id, entry_date desc);

-- RLS pras 2 novas tabelas
alter table obra_items enable row level security;
alter table obra_diary enable row level security;

create policy "members read obra_items" on obra_items
  for select using (is_member_of(module_household(module_id)));
create policy "owner/admin write obra_items" on obra_items
  for all using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]))
  with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));

create policy "members read obra_diary" on obra_diary
  for select using (is_member_of(module_household(module_id)));
create policy "owner/admin write obra_diary" on obra_diary
  for all using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]))
  with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));

-- View útil: total por fase (planejado vs real)
create or replace view obra_phase_totals as
select
  i.phase_id,
  i.module_id,
  sum(coalesce(i.quantity * i.unit_price, 0)) as planned_total,
  sum(case when i.status in ('bought','installed') then coalesce(i.quantity * coalesce(i.actual_unit_price, i.unit_price), 0) else 0 end) as actual_total,
  count(*) as items_count,
  count(*) filter (where i.status = 'planned') as planned_count,
  count(*) filter (where i.status = 'bought' or i.status = 'installed') as done_count
from obra_items i
group by i.phase_id, i.module_id;
