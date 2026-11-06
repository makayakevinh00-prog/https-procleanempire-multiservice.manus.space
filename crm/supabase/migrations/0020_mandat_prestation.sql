-- Date de prestation sur la facture (jamais de facture antidatée : on indique la date d'intervention réelle)
alter table invoices add column if not exists service_date date;
-- Méthode « facture + mandat complété » (ex. SWYFO) : la facture part avec le mandat d'intervention rempli
alter table clients add column if not exists mandate_method boolean not null default false;

update clients set mandate_method = true where name ilike '%swyfo%';
insert into client_emails(client_id, email, label)
select c.id, v.email, v.label from clients c,
  (values ('contact@swyfo.com', 'Mandat + facture')) as v(email, label)
where c.name ilike '%swyfo%' on conflict do nothing;
