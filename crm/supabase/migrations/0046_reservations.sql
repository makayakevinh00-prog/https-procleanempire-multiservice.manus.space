-- 0046 — « Un ménage chez moi, comme Uber » : réservation publique d'un ménage par un particulier ou un propriétaire.
-- La demande attend la validation du patron ; une fois acceptée, elle est publiée aux nettoyeurs de la zone (même circuit que les ménages de la conciergerie).
alter table marketplace_settings add column if not exists price_studio numeric(8, 2) not null default 45 check (price_studio >= 0);
alter table marketplace_settings add column if not exists price_t2 numeric(8, 2) not null default 60 check (price_t2 >= 0);
alter table marketplace_settings add column if not exists price_t3 numeric(8, 2) not null default 75 check (price_t3 >= 0);
alter table marketplace_settings add column if not exists price_maison numeric(8, 2) not null default 95 check (price_maison >= 0);

create table if not exists cleaning_bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, phone text,
  address text not null, postal_code text not null check (postal_code ~ '^\d{5}$'), city text not null,
  job_date date not null,
  kind text not null check (kind in ('studio', 't2', 't3', 'maison')),
  note text, access_notes text,
  price_ht numeric(10, 2) not null check (price_ht >= 0),
  status text not null default 'nouvelle' check (status in ('nouvelle', 'acceptee', 'refusee')),
  job_id uuid references cleaning_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists cleaning_bookings_status_idx on cleaning_bookings (status, created_at desc);
alter table cleaning_bookings enable row level security;
drop policy if exists cleaning_bookings_owner on cleaning_bookings;
create policy cleaning_bookings_owner on cleaning_bookings for all to authenticated using (is_owner()) with check (is_owner());

-- Tarifs affichés au client (prix HT d'un ménage standard par type de logement).
create or replace function booking_prices() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('studio', price_studio, 't2', price_t2, 't3', price_t3, 'maison', price_maison, 'window_start', window_start, 'window_end', window_end) from marketplace_settings limit 1
$$;

-- Réservation : validée côté base (date à venir, code postal, e-mail), prix recalculé ici (jamais celui envoyé par le navigateur).
create or replace function book_cleaning(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/Paris')::date; v_date date; v_kind text := coalesce(p ->> 'kind', ''); v_price numeric; v_email text := lower(trim(coalesce(p ->> 'email', '')));
begin
  if length(trim(coalesce(p ->> 'name', ''))) < 2 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'ARGUMENT: nom et e-mail valides obligatoires'; end if;
  if length(trim(coalesce(p ->> 'address', ''))) < 5 or coalesce(p ->> 'postal_code', '') !~ '^\d{5}$' or length(trim(coalesce(p ->> 'city', ''))) < 2 then raise exception 'ARGUMENT: adresse, code postal et ville obligatoires'; end if;
  begin v_date := (p ->> 'job_date')::date; exception when others then raise exception 'ARGUMENT: date invalide'; end;
  if v_date <= today or v_date > today + 90 then raise exception 'ARGUMENT: choisissez une date entre demain et dans 90 jours'; end if;
  select case v_kind when 'studio' then price_studio when 't2' then price_t2 when 't3' then price_t3 when 'maison' then price_maison end into v_price from marketplace_settings limit 1;
  if v_price is null then raise exception 'ARGUMENT: choisissez un type de logement'; end if;
  if (select count(*) from cleaning_bookings where status = 'nouvelle') >= 100 then raise exception 'ARGUMENT: trop de demandes en attente, réessayez plus tard'; end if;
  if (select count(*) from cleaning_bookings where lower(email) = v_email and created_at > now() - interval '1 day') >= 3 then raise exception 'ARGUMENT: déjà plusieurs demandes aujourd''hui avec cet e-mail'; end if;
  insert into cleaning_bookings(name, email, phone, address, postal_code, city, job_date, kind, note, access_notes, price_ht)
  values (left(trim(p ->> 'name'), 120), left(v_email, 200), left(nullif(trim(coalesce(p ->> 'phone', '')), ''), 40), left(trim(p ->> 'address'), 200), p ->> 'postal_code', left(trim(p ->> 'city'), 100), v_date, v_kind,
          left(nullif(trim(coalesce(p ->> 'note', '')), ''), 1000), left(nullif(trim(coalesce(p ->> 'access_notes', '')), ''), 400), v_price);
  return 'ok';
end $$;

do $$ declare f text; begin
  foreach f in array array['booking_prices()', 'book_cleaning(jsonb)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
