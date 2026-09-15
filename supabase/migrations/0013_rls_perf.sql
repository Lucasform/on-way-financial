-- =========================
-- 0013_rls_perf.sql
-- Corrige 2 achados do advisor de performance do Supabase que pesam em TODA leitura do app:
--
-- 1) multiple_permissive_policies: toda tabela de dominio tinha uma policy "members read X"
--    (FOR SELECT) e outra "owner/admin write X" declarada FOR ALL — FOR ALL cobre SELECT
--    tambem, entao todo SELECT avaliava as duas policies (OR). Troca por policies dedicadas
--    (insert/update/delete), sem tocar em quem pode fazer o que.
-- 2) auth_rls_initplan: policies que chamavam auth.uid() direto (sem select) fazem o Postgres
--    reavaliar a chamada por linha em vez de uma vez por statement.
-- =========================

-- ---------- helpers: auth.uid() via subquery (avaliado 1x por statement) ----------
create or replace function is_member_of(h_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from household_members
    where household_id = h_id and user_id = (select auth.uid())
  );
$$;

create or replace function has_role_in(h_id uuid, roles household_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from household_members
    where household_id = h_id and user_id = (select auth.uid())
      and role = any(roles)
  );
$$;

-- ---------- households / household_members / invites ----------
drop policy if exists "creator insert household" on households;
create policy "creator insert household" on households
  for insert with check (created_by = (select auth.uid()));

drop policy if exists "self read self" on household_members;
create policy "self read self" on household_members
  for select using (user_id = (select auth.uid()));

drop policy if exists "creator inserts first member" on household_members;
create policy "creator inserts first member" on household_members
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "owners/admins manage members" on household_members;
create policy "owners/admins insert members" on household_members
  for insert with check (has_role_in(household_id, array['owner','admin']::household_role[]));
create policy "owners/admins update members" on household_members
  for update using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));
create policy "owners/admins delete members" on household_members
  for delete using (has_role_in(household_id, array['owner','admin']::household_role[]));

drop policy if exists "owners/admins manage invites" on household_invites;
create policy "owners/admins insert invites" on household_invites
  for insert with check (has_role_in(household_id, array['owner','admin']::household_role[]));
create policy "owners/admins update invites" on household_invites
  for update using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));
create policy "owners/admins delete invites" on household_invites
  for delete using (has_role_in(household_id, array['owner','admin']::household_role[]));

drop policy if exists "members read own link tokens" on telegram_link_tokens;
create policy "members read own link tokens" on telegram_link_tokens
  for select using (
    member_id in (
      select id from household_members where user_id = (select auth.uid())
    )
  );

-- ---------- tabelas household_id-based com "owner/admin write X" FOR ALL ----------
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'categories', 'payment_methods', 'transactions', 'alerts', 'modules',
      'suppliers', 'material_types', 'price_quotes'
    ])
  loop
    execute format('drop policy if exists %I on %I;', 'owner/admin write ' || t, t);
    execute format($f$
      create policy "owner/admin insert %s" on %I
        for insert with check (has_role_in(household_id, array['owner','admin']::household_role[]));
    $f$, t, t);
    execute format($f$
      create policy "owner/admin update %s" on %I
        for update using (has_role_in(household_id, array['owner','admin']::household_role[]))
        with check (has_role_in(household_id, array['owner','admin']::household_role[]));
    $f$, t, t);
    execute format($f$
      create policy "owner/admin delete %s" on %I
        for delete using (has_role_in(household_id, array['owner','admin']::household_role[]));
    $f$, t, t);
  end loop;
end$$;

-- ---------- tabelas module_id-based (via module_household()) ----------
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'obra_phases', 'obra_workers', 'obra_gallery', 'obra_messages', 'obra_items', 'obra_diary'
    ])
  loop
    execute format('drop policy if exists %I on %I;', 'owner/admin write ' || t, t);
    execute format($f$
      create policy "owner/admin insert %s" on %I
        for insert with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
    $f$, t, t);
    execute format($f$
      create policy "owner/admin update %s" on %I
        for update using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]))
        with check (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
    $f$, t, t);
    execute format($f$
      create policy "owner/admin delete %s" on %I
        for delete using (has_role_in(module_household(module_id), array['owner','admin']::household_role[]));
    $f$, t, t);
  end loop;
end$$;

-- ---------- indices pra FKs no caminho quente da pagina de fornecedor ----------
create index if not exists obra_items_supplier_id_idx on obra_items (supplier_id);
create index if not exists obra_items_material_type_id_idx on obra_items (material_type_id);
