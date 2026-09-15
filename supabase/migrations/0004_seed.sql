-- =========================
-- 0004_seed.sql
-- Trigger: ao criar household, popula categorias e métodos padrão e adiciona o criador como owner.
-- =========================

create or replace function seed_household_defaults() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  cat_material uuid; cat_labor uuid; cat_equip uuid; cat_service uuid;
  cat_transport uuid; cat_project uuid; cat_docs uuid; cat_other uuid;
  cat_aporte uuid;
begin
  -- Criador entra como owner
  insert into household_members (household_id, user_id, role, display_name)
  values (new.id, new.created_by, 'owner', null)
  on conflict (household_id, user_id) do nothing;

  -- Categorias (expense, focadas em obra)
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Material', 'expense', 'brick-wall', '#F59E0B', true, 10) returning id into cat_material;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Mão de obra', 'expense', 'hard-hat', '#3B82F6', true, 20) returning id into cat_labor;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Equipamento', 'expense', 'wrench', '#8B5CF6', true, 30) returning id into cat_equip;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Serviço', 'expense', 'clipboard-list', '#EC4899', true, 40) returning id into cat_service;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Transporte de material', 'expense', 'truck', '#0EA5E9', true, 50) returning id into cat_transport;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Projeto/Arquitetura', 'expense', 'ruler', '#6366F1', true, 60) returning id into cat_project;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Documentação/Taxas', 'expense', 'landmark', '#F97316', true, 70) returning id into cat_docs;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Outros', 'expense', 'circle-ellipsis', '#9CA3AF', true, 999) returning id into cat_other;

  -- Categorias (income)
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Aporte para obra', 'income', 'wallet', '#22C55E', true, 10) returning id into cat_aporte;

  -- Métodos de pagamento padrão
  insert into payment_methods (household_id, name, kind, is_default) values
    (new.id, 'Dinheiro', 'cash', false);
  insert into payment_methods (household_id, name, kind, is_default) values
    (new.id, 'PIX', 'pix', true);

  return new;
end;
$$;

create trigger households_seed_defaults
after insert on households
for each row execute function seed_household_defaults();

-- Bucket de storage para comprovantes e galeria de obra
insert into storage.buckets (id, name, public)
values ('receipts','receipts', false),
       ('obra-gallery','obra-gallery', false)
on conflict (id) do nothing;

-- Policies de storage: apenas membros do household conseguem ler/escrever
-- O prefixo do path deve ser '<household_id>/...'
create policy "members read receipts" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and is_member_of((split_part(name,'/',1))::uuid)
  );
create policy "owner/admin write receipts" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and has_role_in((split_part(name,'/',1))::uuid, array['owner','admin']::household_role[])
  );
create policy "owner/admin delete receipts" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and has_role_in((split_part(name,'/',1))::uuid, array['owner','admin']::household_role[])
  );

create policy "members read obra-gallery" on storage.objects
  for select using (
    bucket_id = 'obra-gallery'
    and is_member_of((split_part(name,'/',1))::uuid)
  );
create policy "owner/admin write obra-gallery" on storage.objects
  for insert with check (
    bucket_id = 'obra-gallery'
    and has_role_in((split_part(name,'/',1))::uuid, array['owner','admin']::household_role[])
  );
create policy "owner/admin delete obra-gallery" on storage.objects
  for delete using (
    bucket_id = 'obra-gallery'
    and has_role_in((split_part(name,'/',1))::uuid, array['owner','admin']::household_role[])
  );
