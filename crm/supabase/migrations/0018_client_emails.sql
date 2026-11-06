-- Plusieurs adresses e-mail par client (l'adresse principale reste dans clients.email) :
-- on choisit à qui envoyer chaque facture, ou on envoie à tous.
create table if not exists client_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  email text not null,
  label text,
  for_invoices boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists client_emails_uniq on client_emails (client_id, lower(email));
alter table client_emails enable row level security;
drop policy if exists client_emails_owner on client_emails;
create policy client_emails_owner on client_emails for all to authenticated using (is_owner()) with check (is_owner());

-- Adresses de facturation supplémentaires déjà notées sur la fiche SEA
insert into client_emails(client_id, email, label)
select c.id, v.email, 'Facturation' from clients c, (values ('kbeaucle.idfr@gmail.com'), ('idf.marlenedaniel@orange.fr')) as v(email)
where c.name = 'SEA SOCIETE D''EXPLOITATION AUTOMOBILE'
on conflict do nothing;
