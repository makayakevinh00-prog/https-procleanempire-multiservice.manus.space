-- Suivi d'ouverture des e-mails (factures et relances) : un pixel invisible par envoi.
create table if not exists public.email_opens (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  to_email text,
  subject text,
  sent_at timestamptz not null default now(),
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0
);
create index if not exists email_opens_entity_idx on public.email_opens (entity, entity_id);
alter table public.email_opens enable row level security;
drop policy if exists email_opens_owner on public.email_opens;
create policy email_opens_owner on public.email_opens for all using (is_owner()) with check (is_owner());
