-- 0034 — Fiche client entreprise : informations officielles de l'annuaire des entreprises (SIREN, TVA, NAF, forme juridique, dirigeant, statut).
-- Additif : aucune donnée existante n'est modifiée. Le SIRET (déjà présent) reste la référence ; le SIREN est déduit de ses 9 premiers chiffres.
alter table clients add column if not exists siren text;
alter table clients add column if not exists vat_number text;
alter table clients add column if not exists naf_code text;
alter table clients add column if not exists legal_form text;
alter table clients add column if not exists creation_date date;
alter table clients add column if not exists manager text;
alter table clients add column if not exists registry_status text;
alter table clients add column if not exists registry_checked_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clients_registry_status_check') then
    alter table clients add constraint clients_registry_status_check check (registry_status is null or registry_status in ('actif', 'cesse'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_siren_check') then
    alter table clients add constraint clients_siren_check check (siren is null or siren ~ '^\d{9}$');
  end if;
end $$;
create index if not exists clients_siren_idx on clients (siren) where siren is not null;
update clients set siren = left(regexp_replace(siret, '\s', '', 'g'), 9) where siren is null and regexp_replace(coalesce(siret, ''), '\s', '', 'g') ~ '^\d{14}$';
