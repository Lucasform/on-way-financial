-- =========================
-- 0021_obra_folders.sql
-- Pastas nomeadas para organizar Documentos e Galeria da obra.
-- Uma pasta pertence a um kind ('document' ou 'gallery') e não tem
-- subpastas (estrutura de um nível só). Apagar a pasta não apaga os
-- arquivos, só desvincula (folder_id volta a null).
-- =========================

create table obra_folders (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  kind text not null check (kind in ('document', 'gallery')),
  name text not null,
  created_at timestamptz not null default now()
);
create index on obra_folders (module_id, kind);

alter table obra_folders enable row level security;

create policy "members read obra_folders" on obra_folders
  for select using (is_member_of(module_household(module_id)));
create policy "owner/admin insert obra_folders" on obra_folders
  for insert with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
create policy "owner/admin update obra_folders" on obra_folders
  for update using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]))
  with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
create policy "owner/admin delete obra_folders" on obra_folders
  for delete using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));

alter table obra_documents add column folder_id uuid references obra_folders(id) on delete set null;
create index on obra_documents (folder_id);

alter table obra_gallery add column folder_id uuid references obra_folders(id) on delete set null;
create index on obra_gallery (folder_id);
