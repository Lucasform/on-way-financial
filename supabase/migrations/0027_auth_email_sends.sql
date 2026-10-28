-- Registro dos e-mails de autenticação enviados pelo próprio app (Resend).
-- Serve pro limite de frequência por e-mail. Só o service role acessa.
create table public.auth_email_sends (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null check (kind in ('recovery', 'signup', 'magiclink')),
  created_at timestamptz not null default now()
);

create index auth_email_sends_email_kind_idx on public.auth_email_sends (email, kind, created_at desc);

alter table public.auth_email_sends enable row level security;
alter table public.auth_email_sends force row level security;
