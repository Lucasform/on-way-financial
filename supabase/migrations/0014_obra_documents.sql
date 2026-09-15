-- =========================
-- 0014_obra_documents.sql
-- Aba "Documentos": arquivos e projetos da obra (plantas, contratos, PDFs, imagens),
-- separado da Galeria (fotos/vídeos de progresso). Cada arquivo tem nome próprio.
-- =========================

create table if not exists obra_documents (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists obra_documents_module_idx on obra_documents (module_id);

alter table obra_documents enable row level security;

create policy "members read obra_documents" on obra_documents
  for select using (is_member_of(module_household(module_id)));
create policy "owner/admin insert obra_documents" on obra_documents
  for insert with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
create policy "owner/admin update obra_documents" on obra_documents
  for update using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]))
  with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
create policy "owner/admin delete obra_documents" on obra_documents
  for delete using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));

insert into storage.buckets (id, name, public)
values ('obra-documents', 'obra-documents', false)
on conflict (id) do nothing;

create policy "members read obra-documents" on storage.objects
  for select using (
    bucket_id = 'obra-documents'
    and is_member_of((split_part(name,'/',1))::uuid)
  );
create policy "owner/admin write obra-documents" on storage.objects
  for insert with check (
    bucket_id = 'obra-documents'
    and has_role_in((split_part(name,'/',1))::uuid, array['owner','admin']::household_role[])
  );
create policy "owner/admin delete obra-documents" on storage.objects
  for delete using (
    bucket_id = 'obra-documents'
    and has_role_in((split_part(name,'/',1))::uuid, array['owner','admin']::household_role[])
  );
