-- Historique des échanges par mail + réponses préparées (IA) à valider par le patron.
-- ADDITIVE : aucune table ni colonne existante n'est modifiée ou supprimée. À appliquer seulement sur « go » de Kevinh.
-- Renuméroter si une migration plus récente existe déjà sur la base de production.

create table if not exists client_mails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  direction text not null check (direction in ('recu','envoye')),
  kind text not null default 'mail' check (kind in ('mail','relance','mise_en_demeure')),
  subject text,
  body text not null,
  from_email text,
  to_email text,
  occurred_at timestamptz not null default now(),
  -- Pour un mail reçu : « traité » une fois qu'une réponse est partie ou que le patron l'a écarté.
  handled boolean not null default false,
  related_invoice_id uuid references invoices(id) on delete set null,
  external_id text unique,           -- identifiant du mail chez Outlook : évite les doublons à l'import
  created_at timestamptz not null default now()
);
create index if not exists client_mails_client_idx on client_mails (client_id, occurred_at desc);
create index if not exists client_mails_todo_idx on client_mails (direction, handled) where direction = 'recu' and handled = false;

create table if not exists mail_drafts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind text not null default 'reponse' check (kind in ('reponse','mise_en_demeure')),
  reply_to_mail_id uuid references client_mails(id) on delete set null,
  related_invoice_id uuid references invoices(id) on delete set null,
  to_email text,
  subject text not null,
  body text not null,
  status text not null default 'a_valider' check (status in ('a_valider','envoye','ecarte')),
  generated_by text not null default 'ia' check (generated_by in ('ia','modele','manuel')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists mail_drafts_client_idx on mail_drafts (client_id, created_at desc);
-- Un seul brouillon ouvert par mail reçu et par type : pas de doublon si on clique deux fois.
create unique index if not exists mail_drafts_open_uniq on mail_drafts (kind, coalesce(reply_to_mail_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(related_invoice_id, '00000000-0000-0000-0000-000000000000'::uuid), client_id) where status = 'a_valider';

do $$
declare t text;
begin
  foreach t in array array['client_mails','mail_drafts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;
