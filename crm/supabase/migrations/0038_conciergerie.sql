-- 0038 — Pôle Conciergerie : logements gérés, réservations importées (lien calendrier iCal d'Airbnb, Booking, Abritel…), revenus pour la commission, automatisations.
-- Additif. Le nettoyage (bureaux, commerces, ponctuel) et la conciergerie (Airbnb, gestion locative) deviennent deux pôles distincts ; les familles d'activité existantes ne changent pas.
create table if not exists concierge_listings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid not null references clients(id) on delete cascade,        -- le propriétaire
  contract_id uuid references contracts(id) on delete set null,
  site_id uuid references sites(id) on delete set null,
  platform text not null default 'airbnb' check (platform in ('airbnb', 'booking', 'abritel', 'autre')),
  ical_url text,
  checkout_time time not null default '11:00',
  cleaning_hours numeric(5, 2) check (cleaning_hours is null or cleaning_hours > 0),
  cleaning_price_ht numeric(12, 2) check (cleaning_price_ht is null or cleaning_price_ht >= 0),
  staff_id uuid references staff(id) on delete set null,
  auto_cleaning boolean not null default true,
  last_sync_at timestamptz, last_sync_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists concierge_listings_client_idx on concierge_listings (client_id);

-- Réservations : dates seulement. Aucun nom, téléphone ni montant n'est conservé.
create table if not exists concierge_stays (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references concierge_listings(id) on delete cascade,
  uid text not null,
  check_in date not null, check_out date not null,
  summary text,
  cancelled boolean not null default false,
  intervention_id uuid references interventions(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (listing_id, uid), check (check_out >= check_in)
);
create index if not exists concierge_stays_out_idx on concierge_stays (check_out);

-- Revenus locatifs d'un mois pour un contrat à commission (saisis depuis le relevé de la plateforme) : base du calcul de la commission.
create table if not exists concierge_revenues (
  contract_id uuid not null references contracts(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  revenue_ht numeric(12, 2) not null check (revenue_ht >= 0),
  invoice_id uuid references invoices(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (contract_id, month)
);

create table if not exists concierge_automations (
  key text primary key check (key in ('menages', 'facturation', 'messages')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into concierge_automations (key) values ('menages'), ('facturation'), ('messages') on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['concierge_listings', 'concierge_stays', 'concierge_revenues', 'concierge_automations'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

-- Catalogue : une rubrique « Conciergerie » à part ; le catalogue du nettoyage ne contient plus d'Airbnb.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category') then
    alter table services drop constraint if exists services_category_check;
    alter table services add constraint services_category_check check (category is null or category in ('bureaux', 'logements', 'commerces', 'vehicules', 'specialites', 'options', 'conciergerie'));
    update services set category = 'conciergerie' where code in ('AIR-PAR-STU', 'AIR-PAR-T2', 'AIR-PAR-T3', 'AIR-PAR-T4', 'AIR-XL-ESS', 'AIR-STU-ESS', 'AIR-T2-ESS', 'AIR-T3-ESS', 'AIR-T4-ESS', 'AIR-REM', 'AIR-OPT-URG', 'AIR-OPT-NUIT', 'LIN-JEU', 'LIN-SET', 'CTR-ELY-MEN', 'CTR-ELY-GEST', 'CTR-CONCIERGAIR', 'CTR-GEETHA');
  end if;
end $$;
