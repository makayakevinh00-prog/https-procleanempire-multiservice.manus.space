-- 0068 — Calendriers externes (Outlook, Google, iCloud) affichés dans l'onglet « Calendrier » du CRM.
-- Chaque calendrier publié (.ics, lecture seule) est rangé dans une famille : opérationnel, commercial ou personnel.
-- Le lien publié est un secret : la table est réservée au patron.
create table if not exists external_calendars (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(btrim(label)) between 1 and 60),
  kind text not null check (kind in ('operationnel', 'commercial', 'personnel')),
  url text not null check (url ~ '^https://' and length(url) <= 1000),
  created_at timestamptz not null default now()
);
alter table external_calendars enable row level security;
revoke all on external_calendars from anon;
drop policy if exists external_calendars_owner on external_calendars;
create policy external_calendars_owner on external_calendars for all to authenticated using (is_owner()) with check (is_owner());
