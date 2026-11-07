-- Fornecedores compartilhados entre obras conectadas.
-- Cada obra continua com os próprios fornecedores; "shared" só coloca o fornecedor na vitrine
-- das obras parceiras, e "shared_source_id" liga a cópia ao fornecedor de origem.
alter table public.suppliers
  add column shared boolean not null default false,
  add column shared_source_id uuid references public.suppliers (id) on delete set null;

create index suppliers_shared_idx on public.suppliers (household_id) where shared;

-- Conexão entre duas obras. Nasce pendente, endereçada a um e-mail; quem tem esse e-mail aceita
-- escolhendo a obra dele. Leitura e escrita só pelo servidor (service role), com as checagens na rota.
create table public.household_partners (
  id uuid primary key default gen_random_uuid(),
  requester_household_id uuid not null references public.households (id) on delete cascade,
  partner_household_id uuid references public.households (id) on delete cascade,
  invite_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (partner_household_id is null or partner_household_id <> requester_household_id),
  check (status = 'pending' or partner_household_id is not null)
);

create unique index household_partners_pair_idx
  on public.household_partners (least(requester_household_id, partner_household_id), greatest(requester_household_id, partner_household_id))
  where partner_household_id is not null;
create index household_partners_email_idx on public.household_partners (lower(invite_email)) where status = 'pending';

alter table public.household_partners enable row level security;
alter table public.household_partners force row level security;
