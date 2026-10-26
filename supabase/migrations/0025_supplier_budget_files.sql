-- =========================
-- 0025_supplier_budget_files.sql
-- PDFs de orçamento anexados a um fornecedor (mais de um por fornecedor).
-- Reusa o bucket "obra-documents" já existente.
-- =========================

create table public.supplier_budget_files (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index supplier_budget_files_module_id_idx on public.supplier_budget_files(module_id);
create index supplier_budget_files_supplier_id_idx on public.supplier_budget_files(supplier_id);

alter table public.supplier_budget_files enable row level security;

create policy "members read supplier_budget_files"
  on public.supplier_budget_files for select
  using (is_member_of(module_household(module_id)));

create policy "owner/admin insert supplier_budget_files"
  on public.supplier_budget_files for insert
  with check (has_role_in(module_household(module_id), array['owner'::household_role, 'admin'::household_role]));

create policy "owner/admin delete supplier_budget_files"
  on public.supplier_budget_files for delete
  using (has_role_in(module_household(module_id), array['owner'::household_role, 'admin'::household_role]));
