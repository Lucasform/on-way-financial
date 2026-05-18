-- =========================
-- 0002_rls.sql
-- Row Level Security em todas as tabelas de domínio.
-- =========================

-- ---------- Helper functions ----------
create or replace function is_member_of(h_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from household_members
    where household_id = h_id and user_id = auth.uid()
  );
$$;

create or replace function has_role_in(h_id uuid, roles household_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from household_members
    where household_id = h_id and user_id = auth.uid()
      and role = any(roles)
  );
$$;

create or replace function module_household(m_id uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select household_id from modules where id = m_id;
$$;

-- ---------- HOUSEHOLDS ----------
alter table households enable row level security;
create policy "members read household" on households
  for select using (is_member_of(id));
create policy "creator insert household" on households
  for insert with check (created_by = auth.uid());
create policy "owners update household" on households
  for update using (has_role_in(id, array['owner']::household_role[]));
create policy "owners delete household" on households
  for delete using (has_role_in(id, array['owner']::household_role[]));

-- ---------- HOUSEHOLD MEMBERS ----------
alter table household_members enable row level security;
create policy "members read members" on household_members
  for select using (is_member_of(household_id));
create policy "self read self" on household_members
  for select using (user_id = auth.uid());
create policy "owners/admins manage members" on household_members
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));
create policy "creator inserts first member" on household_members
  for insert with check (user_id = auth.uid());

-- ---------- INVITES ----------
alter table household_invites enable row level security;
create policy "members read invites" on household_invites
  for select using (is_member_of(household_id));
create policy "owners/admins manage invites" on household_invites
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

-- ---------- CATEGORIES ----------
alter table categories enable row level security;
create policy "members read categories" on categories
  for select using (is_member_of(household_id));
create policy "owner/admin write categories" on categories
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

-- ---------- PAYMENT METHODS ----------
alter table payment_methods enable row level security;
create policy "members read payment_methods" on payment_methods
  for select using (is_member_of(household_id));
create policy "owner/admin write payment_methods" on payment_methods
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

-- ---------- TRANSACTIONS ----------
alter table transactions enable row level security;
create policy "members read transactions" on transactions
  for select using (is_member_of(household_id));
create policy "owner/admin write transactions" on transactions
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

-- ---------- ALERTS ----------
alter table alerts enable row level security;
create policy "members read alerts" on alerts
  for select using (is_member_of(household_id));
create policy "owner/admin write alerts" on alerts
  for all using (has_role_in(household_id, array['owner','admin']::household_role[]))
  with check (has_role_in(household_id, array['owner','admin']::household_role[]));

-- ---------- WHATSAPP SESSIONS / RATE LIMIT ----------
alter table whatsapp_sessions enable row level security;
-- somente service_role acessa (server-only). Sem policies = ninguém com anon/auth lê.

alter table whatsapp_rate_limit enable row level security;

-- ---------- AUDIT LOG ----------
alter table audit_log enable row level security;
create policy "members read audit" on audit_log
  for select using (household_id is not null and is_member_of(household_id));
-- INSERT via service_role apenas.
