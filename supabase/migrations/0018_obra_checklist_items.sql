-- =========================
-- 0018_obra_checklist_items.sql
-- Checklist de referência da obra: processos, serviços e materiais por fase,
-- da terraplenagem ao acabamento. Consultar, estimar valor e depois "adicionar
-- à tabela" (vira item real em obra_items) quando o valor for conhecido.
-- =========================

create table if not exists obra_checklist_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  phase_name text not null,
  category text not null check (category in ('material','serviço','processo')),
  name text not null,
  unit text,
  estimated_value numeric(12,2),
  is_estimate boolean not null default true,
  status text not null default 'pending' check (status in ('pending','added')),
  obra_item_id uuid references obra_items(id) on delete set null,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists obra_checklist_items_module_idx on obra_checklist_items (module_id, position);

create trigger obra_checklist_items_updated_at before update on obra_checklist_items
for each row execute function set_updated_at();

alter table obra_checklist_items enable row level security;

create policy "members read obra_checklist_items" on obra_checklist_items
  for select using (is_member_of(module_household(module_id)));
create policy "owner/admin insert obra_checklist_items" on obra_checklist_items
  for insert with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
create policy "owner/admin update obra_checklist_items" on obra_checklist_items
  for update using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]))
  with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
create policy "owner/admin delete obra_checklist_items" on obra_checklist_items
  for delete using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
