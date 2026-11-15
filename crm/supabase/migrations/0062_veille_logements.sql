-- 0062 — Veille par logement (conciergerie) : prix par période, prix relevés sur le marché, avis des voyageurs, améliorations à faire.
-- Tout est saisi dans le CRM (Airbnb ne donne pas d'accès automatique à ces informations sans logiciel intermédiaire).
create table if not exists listing_prices (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  label text not null,
  start_date date not null,
  end_date date not null,
  price numeric(10, 2) not null check (price >= 0),
  min_nights int check (min_nights is null or min_nights between 1 and 365),
  note text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists listing_prices_idx on listing_prices (listing_id, start_date);

create table if not exists listing_market (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  seen_on date not null default current_date,
  label text not null,
  price numeric(10, 2) not null check (price >= 0),
  url text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists listing_market_idx on listing_market (listing_id, seen_on desc);

create table if not exists listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  review_date date not null default current_date,
  source text not null default 'airbnb',
  guest text,
  rating numeric(2, 1) check (rating is null or rating between 1 and 5),
  comment text,
  topics text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists listing_reviews_idx on listing_reviews (listing_id, review_date desc);

create table if not exists listing_improvements (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  title text not null,
  detail text,
  priority text not null default 'normale' check (priority in ('basse', 'normale', 'haute')),
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'fait')),
  cost numeric(10, 2) check (cost is null or cost >= 0),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists listing_improvements_idx on listing_improvements (listing_id, status);

do $$ declare t text; begin
  foreach t in array array['listing_prices', 'listing_market', 'listing_reviews', 'listing_improvements'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
    if to_regprocedure('team_can(text,text)') is not null then
      execute format('drop policy if exists %I on %I', t || '_team_read', t);
      execute format('create policy %I on %I for select to authenticated using (team_can(''conciergerie'', ''read''))', t || '_team_read', t);
      execute format('drop policy if exists %I on %I', t || '_team_write', t);
      execute format('create policy %I on %I for all to authenticated using (team_can(''conciergerie'', ''write'')) with check (team_can(''conciergerie'', ''write''))', t || '_team_write', t);
    end if;
    -- Rattachement au logement (supprimé avec lui) quand la table des logements existe.
    if to_regclass('public.concierge_listings') is not null and not exists (select 1 from pg_constraint where conname = t || '_listing_fk') then
      execute format('alter table %I add constraint %I foreign key (listing_id) references concierge_listings(id) on delete cascade', t, t || '_listing_fk');
    end if;
  end loop;
  if to_regclass('public.concierge_listings') is not null then
    execute 'alter table concierge_listings add column if not exists public_url text';
    execute 'alter table concierge_listings add column if not exists base_price numeric(10, 2) check (base_price is null or base_price >= 0)';
  end if;
end $$;
