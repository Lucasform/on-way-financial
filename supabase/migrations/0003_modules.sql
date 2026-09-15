-- =========================
-- 0003_modules.sql
-- App 100% focado em obra: módulo único (kind='obra' por household).
-- =========================

create type module_kind as enum ('obra');
create type module_status as enum ('planning','active','paused','completed','archived');

create table modules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  kind module_kind not null,
  name text not null,
  status module_status not null default 'planning',
  start_date date,
  end_date date,
  budget numeric(12,2),
  cover_image_url text,
  config jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger modules_updated_at before update on modules
for each row execute function set_updated_at();

create index on modules (household_id, kind);
create index on modules (household_id, status);

-- Função helper para RLS das tabelas dependentes de módulos
create or replace function module_household(m_id uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select household_id from modules where id = m_id;
$$;

-- ===== OBRA =====
create table obra_phases (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  name text not null,
  planned_budget numeric(12,2),
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  status text not null default 'todo' check (status in ('todo','doing','done','blocked')),
  position smallint not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index on obra_phases (module_id, position);

create table obra_workers (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  name text not null,
  role text,
  whatsapp_phone text,
  daily_rate numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);
create index on obra_workers (module_id);

create table obra_gallery (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  phase_id uuid references obra_phases(id) on delete set null,
  image_url text not null,
  caption text,
  taken_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);
create index on obra_gallery (module_id, taken_at desc);

create table obra_messages (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  worker_id uuid not null references obra_workers(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  body text not null,
  sent_at timestamptz not null default now()
);
create index on obra_messages (worker_id, sent_at desc);

-- ===== RLS dos módulos =====
alter table modules enable row level security;
create policy "members read modules" on modules
  for select using (is_member_of(household_id));
create policy "owner/admin write modules" on modules
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

-- gera policy padrão para tabelas dependentes do módulo
do $$
declare t text;
begin
  for t in
    select unnest(array['obra_phases','obra_workers','obra_gallery','obra_messages'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      create policy "members read %s" on %I
        for select using (is_member_of(module_household(module_id)));
    $f$, t, t);
    execute format($f$
      create policy "owner/admin write %s" on %I
        for all using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]))
        with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
    $f$, t, t);
  end loop;
end$$;
