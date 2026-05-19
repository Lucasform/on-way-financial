-- =========================
-- 0007_travel_advanced.sql
-- Viagem profissional: itinerário dia-a-dia, atividades, checklist, gallery com vídeo.
-- =========================

-- Galeria de viagem (similar à obra)
create table if not exists travel_gallery (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image','video')),
  url text not null,
  thumbnail_url text,
  caption text,
  taken_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);

create index if not exists travel_gallery_module_idx on travel_gallery (module_id, taken_at desc);

-- Itinerário: 1 registro por dia da viagem
create table if not exists travel_days (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  day_number smallint not null check (day_number >= 1),
  date date,
  city text,
  country text,
  accommodation text,            -- "Hilton Lisboa, quarto 502"
  notes text,
  created_at timestamptz not null default now(),
  unique (module_id, day_number)
);

create index if not exists travel_days_module_idx on travel_days (module_id, day_number);

-- Atividades (do dia ou da viagem em geral)
create table if not exists travel_activities (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  day_id uuid references travel_days(id) on delete set null,
  kind text not null default 'sight' check (kind in ('sight','food','transport','shopping','show','tour','rest','other')),
  name text not null,
  start_time time,                 -- horário previsto
  duration_minutes integer,
  location text,
  planned_cost numeric(12,2),
  actual_cost numeric(12,2),
  currency text default 'BRL',
  booking_ref text,
  notes text,
  status text not null default 'planned' check (status in ('planned','done','cancelled')),
  rating smallint check (rating is null or rating between 1 and 5),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger travel_activities_updated_at before update on travel_activities
for each row execute function set_updated_at();

create index if not exists travel_activities_module_idx on travel_activities (module_id);
create index if not exists travel_activities_day_idx on travel_activities (day_id);

-- Checklist de preparação (docs, vacinas, malas, banco, eletrônicos)
create table if not exists travel_checklist (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  category text not null default 'other' check (category in ('documents','vaccines','luggage','banking','electronics','reservations','other')),
  item text not null,
  status text not null default 'pending' check (status in ('pending','done','na')),
  due_date date,
  notes text,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists travel_checklist_module_idx on travel_checklist (module_id, category);

-- RLS
alter table travel_gallery enable row level security;
alter table travel_days enable row level security;
alter table travel_activities enable row level security;
alter table travel_checklist enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['travel_gallery','travel_days','travel_activities','travel_checklist'])
  loop
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
