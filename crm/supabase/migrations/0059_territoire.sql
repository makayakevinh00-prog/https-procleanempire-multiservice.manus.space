-- 0059 — Territoire commercial : zones (95, puis 93, 94, 75), établissements à prospecter (annuaire officiel, avec position),
-- avancement (à prospecter / en cours / client) déduit des fiches clients par le SIREN, et critères pour ouvrir la zone suivante.
create table if not exists territory_zones (
  code text primary key check (code ~ '^(\d{2,3}|2[AB])$'),
  label text not null,
  rank int not null,
  status text not null default 'verrouillee' check (status in ('active', 'verrouillee', 'terminee')),
  target_pct numeric(5, 2) not null default 80 check (target_pct between 1 and 100),
  min_mrr numeric(12, 2) not null default 0 check (min_mrr >= 0),
  min_loyal int not null default 0 check (min_loyal >= 0),
  opened_at timestamptz,
  created_at timestamptz not null default now()
);
insert into territory_zones(code, label, rank, status, opened_at) values
  ('95', 'Val-d''Oise', 1, 'active', now()), ('93', 'Seine-Saint-Denis', 2, 'verrouillee', null), ('94', 'Val-de-Marne', 3, 'verrouillee', null), ('75', 'Paris', 4, 'verrouillee', null)
on conflict (code) do nothing;

create table if not exists territory_targets (
  siret text primary key check (siret ~ '^\d{14}$'),
  siren text not null check (siren ~ '^\d{9}$'),
  name text not null,
  naf_code text,
  headcount text,
  address text,
  postal_code text,
  city text,
  dept text not null,
  lat double precision,
  lng double precision,
  sector text not null,
  excluded boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists territory_targets_dept_idx on territory_targets (dept, excluded);
create index if not exists territory_targets_siren_idx on territory_targets (siren);

-- Avancement du chargement d'un secteur dans une zone (l'annuaire se lit page par page).
create table if not exists territory_loads (
  dept text not null,
  sector text not null,
  next_page int not null default 1,
  total_pages int,
  total_results int,
  updated_at timestamptz not null default now(),
  primary key (dept, sector)
);

do $$ declare t text; begin
  foreach t in array array['territory_zones', 'territory_targets', 'territory_loads'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
    if to_regprocedure('team_can(text,text)') is not null then
      execute format('drop policy if exists %I on %I', t || '_team_read', t);
      execute format('create policy %I on %I for select to authenticated using (team_can(''veille'', ''read''))', t || '_team_read', t);
      execute format('drop policy if exists %I on %I', t || '_team_write', t);
      execute format('create policy %I on %I for all to authenticated using (team_can(''veille'', ''write'')) with check (team_can(''veille'', ''write''))', t || '_team_write', t);
    end if;
  end loop;
end $$;

-- Données d'une zone pour la carte. S'exécute avec les droits de la personne connectée (les règles d'accès des tables s'appliquent).
-- État d'un établissement : « client » si une fiche client active porte son SIREN, « en_cours » si une fiche prospect le porte, sinon « cible ».
create or replace function territory_data(p_dept text) returns jsonb language plpgsql stable as $$
begin
  return (with cl as (
    select distinct on (c.siren) c.siren, c.id, c.name, case when c.pipeline = 'client_actif' or c.status = 'actif' then 'client' else 'en_cours' end as state
      from clients c where c.siren is not null and c.status <> 'inactif'
     order by c.siren, (c.pipeline = 'client_actif' or c.status = 'actif') desc
  ), t as (
    select x.*, coalesce(cl.state, 'cible') as state, cl.id as client_id
      from territory_targets x left join cl on cl.siren = x.siren
     where x.dept = p_dept and not x.excluded
  )
  select jsonb_build_object(
    'total', (select count(*) from t),
    'clients', (select count(*) from t where state = 'client'),
    'en_cours', (select count(*) from t where state = 'en_cours'),
    'excluded', (select count(*) from territory_targets where dept = p_dept and excluded),
    'zone_clients', (select count(*) from clients c where c.status = 'actif' and left(coalesce(c.postal_code, ''), length(p_dept)) = p_dept),
    'mrr', coalesce((select sum(k.monthly_amount_ht) from contracts k join clients c on c.id = k.client_id where k.status = 'actif' and left(coalesce(c.postal_code, ''), length(p_dept)) = p_dept), 0),
    'loyal', (select count(distinct c.id) from contracts k join clients c on c.id = k.client_id where k.status = 'actif' and k.start_date <= current_date - 180 and left(coalesce(c.postal_code, ''), length(p_dept)) = p_dept),
    'targets', coalesce((select jsonb_agg(jsonb_build_array(siret, name, city, lat, lng, headcount, sector, state, client_id, naf_code, address, postal_code) order by name) from (select * from t order by (state <> 'cible') desc, name limit 8000) y), '[]'::jsonb)));
end $$;
revoke all on function territory_data(text) from public, anon;
grant execute on function territory_data(text) to authenticated;
