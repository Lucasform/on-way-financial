create table public.obra_activities (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  status text not null default 'pendente' check (status in ('pendente', 'feito')),
  done_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index obra_activities_module_id_idx on public.obra_activities(module_id);

alter table public.obra_activities enable row level security;

create trigger obra_activities_updated_at
  before update on public.obra_activities
  for each row execute function set_updated_at();

create policy "members read obra_activities"
  on public.obra_activities for select
  using (is_member_of(module_household(module_id)));

create policy "owner/admin insert obra_activities"
  on public.obra_activities for insert
  with check (has_role_in(module_household(module_id), array['owner'::household_role, 'admin'::household_role]));

create policy "owner/admin update obra_activities"
  on public.obra_activities for update
  using (has_role_in(module_household(module_id), array['owner'::household_role, 'admin'::household_role]))
  with check (has_role_in(module_household(module_id), array['owner'::household_role, 'admin'::household_role]));

create policy "owner/admin delete obra_activities"
  on public.obra_activities for delete
  using (has_role_in(module_household(module_id), array['owner'::household_role, 'admin'::household_role]));
