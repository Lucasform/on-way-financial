-- =========================
-- 0004_seed.sql
-- Trigger: ao criar household, popula categorias e métodos padrão e adiciona o criador como owner.
-- =========================

create or replace function seed_household_defaults() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  cat_food uuid; cat_market uuid; cat_transport uuid; cat_home uuid;
  cat_health uuid; cat_leisure uuid; cat_edu uuid; cat_subs uuid;
  cat_clothes uuid; cat_pets uuid; cat_taxes uuid;
  cat_salary uuid; cat_invest uuid; cat_other uuid;
begin
  -- Criador entra como owner
  insert into household_members (household_id, user_id, role, display_name)
  values (new.id, new.created_by, 'owner', null)
  on conflict (household_id, user_id) do nothing;

  -- Categorias (expense)
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Alimentação', 'expense', 'utensils-crossed', '#F59E0B', true, 10) returning id into cat_food;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Mercado', 'expense', 'shopping-cart', '#22C55E', true, 20) returning id into cat_market;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Transporte', 'expense', 'car', '#3B82F6', true, 30) returning id into cat_transport;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Moradia', 'expense', 'home', '#8B5CF6', true, 40) returning id into cat_home;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Saúde', 'expense', 'heart-pulse', '#EF4444', true, 50) returning id into cat_health;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Lazer', 'expense', 'party-popper', '#EC4899', true, 60) returning id into cat_leisure;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Educação', 'expense', 'graduation-cap', '#6366F1', true, 70) returning id into cat_edu;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Assinaturas', 'expense', 'repeat', '#0EA5E9', true, 80) returning id into cat_subs;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Vestuário', 'expense', 'shirt', '#A855F7', true, 90) returning id into cat_clothes;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Pets', 'expense', 'paw-print', '#14B8A6', true, 100) returning id into cat_pets;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Impostos', 'expense', 'landmark', '#F97316', true, 110) returning id into cat_taxes;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Outros', 'expense', 'circle-ellipsis', '#9CA3AF', true, 999) returning id into cat_other;

  -- Categorias (income)
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Salário', 'income', 'wallet', '#22C55E', true, 10) returning id into cat_salary;
  insert into categories (household_id, name, type, icon, color, is_system, position) values
    (new.id, 'Investimentos', 'income', 'trending-up', '#00D1A0', true, 20) returning id into cat_invest;

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
