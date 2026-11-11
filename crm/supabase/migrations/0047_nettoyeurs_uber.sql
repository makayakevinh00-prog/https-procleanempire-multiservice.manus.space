-- 0047 — Nettoyeurs « comme Uber Eats » : accès immédiat après contrôle du SIRET, zone en rayon autour de l'adresse (avec distance),
-- ménages Airbnb / Booking publiés automatiquement à chaque réservation, sans clé de service (tout passe par le secret du serveur).
alter table cleaners add column if not exists address_line text;
alter table cleaners add column if not exists postal_code text;
alter table cleaners add column if not exists lat double precision;
alter table cleaners add column if not exists lng double precision;
alter table cleaners add column if not exists radius_km int not null default 15;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cleaners_radius_check') then alter table cleaners add constraint cleaners_radius_check check (radius_km between 1 and 100); end if;
end $$;
alter table cleaning_jobs add column if not exists lat double precision;
alter table cleaning_jobs add column if not exists lng double precision;
alter table marketplace_settings add column if not exists last_sync_at timestamptz;
alter table marketplace_settings alter column auto_publish set default true;
update marketplace_settings set auto_publish = true;

-- Distance à vol d'oiseau en km (formule de haversine).
create or replace function geo_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision) returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(least(1, power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))
$$;

-- Le ménage est-il dans la zone du nettoyeur ? Rayon si les deux positions sont connues, sinon même département que son adresse.
create or replace function cleaner_covers(c cleaners, j cleaning_jobs) returns boolean language sql stable as $$
  select case when c.lat is not null and j.lat is not null then geo_km(c.lat, c.lng, j.lat, j.lng) <= c.radius_km
              else exists (select 1 from unnest(c.departments) d where left(coalesce(j.postal_code, ''), length(d)) = d) end
$$;
revoke all on function cleaner_covers(cleaners, cleaning_jobs) from public, anon, authenticated;

create or replace function cleaner_open_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  return jsonb_build_object('jobs', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'date', x.job_date, 'window_start', x.window_start, 'window_end', x.window_end, 'hours', x.duration_hours,
        'city', x.city, 'postal_code', x.postal_code, 'amount', x.cleaner_amount, 'distance_km', x.km,
        'favorite', x.fav, 'priority_until', case when x.priority_until > now() then x.priority_until else null end) order by x.job_date, x.km nulls last, x.window_start)
      from (select j.*, case when c.lat is not null and j.lat is not null then round(geo_km(c.lat, c.lng, j.lat, j.lng)::numeric, 1) end as km,
                   exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) as fav
              from cleaning_jobs j where j.status = 'ouverte' and j.job_date >= today and cleaner_covers(c, j)) x
     where (x.priority_until is null or x.priority_until <= now() or x.fav)), '[]'::jsonb));
end $$;

create or replace function cleaner_accept_job(p_token text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; today date := (now() at time zone 'Europe/Paris')::date; fav boolean;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job for update;
  if not found or j.status <> 'ouverte' then raise exception 'INDISPONIBLE: ce ménage vient d''être pris ou n''est plus disponible'; end if;
  if j.job_date < today then raise exception 'INDISPONIBLE: cette date est passée'; end if;
  if not cleaner_covers(c, j) then raise exception 'INDISPONIBLE: ce ménage est hors de votre zone'; end if;
  select exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) into fav;
  if j.priority_until is not null and j.priority_until > now() and not fav then raise exception 'INDISPONIBLE: ce ménage est d''abord proposé aux favoris du propriétaire'; end if;
  update cleaning_jobs set status = 'acceptee', cleaner_id = c.id, accepted_at = now() where id = j.id;
  if j.intervention_id is not null then update interventions set assignee = c.full_name where id = j.intervention_id; end if;
  return jsonb_build_object('ok', true, 'title', j.title, 'date', j.job_date, 'city', j.city, 'name', c.full_name, 'amount', j.cleaner_amount);
end $$;

-- Profil : adresse et rayon (le serveur a localisé l'adresse), téléphone, IBAN.
create or replace function cleaner_update_profile2(p_token text, p_address text, p_postal text, p_city text, p_lat double precision, p_lng double precision, p_radius int, p_phone text, p_iban text default null) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; v_iban text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
begin
  c := cleaner_by_token(p_token);
  if coalesce(p_postal, '') !~ '^\d{5}$' then raise exception 'ARGUMENT: code postal à 5 chiffres obligatoire'; end if;
  if p_radius is null or p_radius < 1 or p_radius > 100 then raise exception 'ARGUMENT: rayon entre 1 et 100 km'; end if;
  if (p_lat is null) <> (p_lng is null) or (p_lat is not null and (p_lat not between 41 and 52 or p_lng not between -6 and 10)) then raise exception 'ARGUMENT: position hors de France métropolitaine'; end if;
  if v_iban <> '' and (v_iban !~ '^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$' or length(v_iban) > 34) then raise exception 'ARGUMENT: IBAN invalide'; end if;
  update cleaners set address_line = left(nullif(trim(coalesce(p_address, '')), ''), 200), postal_code = p_postal, city = left(nullif(trim(coalesce(p_city, '')), ''), 100), lat = p_lat, lng = p_lng, radius_km = p_radius,
         departments = array[left(p_postal, case when left(p_postal, 2) in ('97', '98') then 3 else 2 end)], phone = left(nullif(trim(coalesce(p_phone, '')), ''), 40), iban = case when v_iban = '' then iban else v_iban end where id = c.id;
end $$;

create or replace function cleaner_overview(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; s marketplace_settings;
begin
  c := cleaner_by_token(p_token);
  select * into s from marketplace_settings limit 1;
  return jsonb_build_object('name', c.full_name, 'email', c.email, 'phone', c.phone, 'departments', c.departments, 'city', c.city, 'has_iban', c.iban is not null,
    'address_line', c.address_line, 'postal_code', c.postal_code, 'radius_km', c.radius_km, 'has_location', c.lat is not null,
    'iban_hint', case when c.iban is null then null else '•••• ' || right(c.iban, 4) end,
    'window_start', s.window_start, 'window_end', s.window_end, 'max_end', s.max_end,
    'done', (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee'),
    'pending_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), 0),
    'to_pay_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee' and j.payout_id is null), 0),
    'in_payout_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'a_payer'), 0),
    'paid_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'paye'), 0),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('period_start', p.period_start, 'period_end', p.period_end, 'amount', p.amount, 'jobs', p.jobs, 'status', p.status, 'paid_on', p.paid_on) order by p.period_end desc) from (select * from cleaning_payouts where cleaner_id = c.id order by period_end desc limit 24) p), '[]'::jsonb));
end $$;

-- ───────────── Serveur seulement (secret) ─────────────

-- Inscription instantanée : le serveur a vérifié le SIRET dans l'annuaire officiel et fournit l'empreinte du lien.
create or replace function automation_cleaner_register(p_secret text, p jsonb, p_token_hash text) returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p ->> 'email', ''))); v_name text := trim(coalesce(p ->> 'full_name', '')); v_postal text := coalesce(p ->> 'postal_code', ''); v_status text := coalesce(p ->> 'statut_pro', 'auto_entrepreneur');
        v_lat double precision := nullif(p ->> 'lat', '')::double precision; v_lng double precision := nullif(p ->> 'lng', '')::double precision; v_radius int := coalesce(nullif(p ->> 'radius_km', '')::int, 15); v_active boolean := coalesce((p ->> 'verified')::boolean, false);
begin
  perform automation_guard(p_secret);
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_name) < 2 then raise exception 'ARGUMENT: nom et e-mail valides obligatoires'; end if;
  if v_postal !~ '^\d{5}$' then raise exception 'ARGUMENT: code postal à 5 chiffres obligatoire'; end if;
  if v_radius < 1 or v_radius > 100 then raise exception 'ARGUMENT: rayon entre 1 et 100 km'; end if;
  if v_status not in ('etudiant', 'auto_entrepreneur', 'entreprise') then v_status := 'auto_entrepreneur'; end if;
  if exists (select 1 from cleaners where lower(email) = v_email) then return 'deja'; end if;
  if (select count(*) from cleaners where status = 'en_attente') >= 200 then raise exception 'ARGUMENT: trop de demandes en attente, réessayez plus tard'; end if;
  insert into cleaners(full_name, email, phone, siret, statut_pro, departments, city, address_line, postal_code, lat, lng, radius_km, status, token_hash, token_set_at, approved_at)
  values (left(v_name, 120), left(v_email, 200), left(nullif(trim(coalesce(p ->> 'phone', '')), ''), 40), nullif(regexp_replace(coalesce(p ->> 'siret', ''), '\s', '', 'g'), ''), v_status,
          array[left(v_postal, case when left(v_postal, 2) in ('97', '98') then 3 else 2 end)], left(nullif(trim(coalesce(p ->> 'city', '')), ''), 100), left(nullif(trim(coalesce(p ->> 'address_line', '')), ''), 200), v_postal, v_lat, v_lng, v_radius,
          case when v_active then 'actif' else 'en_attente' end, case when v_active then p_token_hash end, case when v_active then now() end, case when v_active then now() end);
  return case when v_active then 'actif' else 'attente' end;
end $$;

-- Retrouver son accès : un nouveau lien est envoyé à l'adresse du compte (au plus un toutes les 5 minutes) ; l'ancien cesse de fonctionner.
create or replace function automation_cleaner_new_link(p_secret text, p_email text, p_token_hash text) returns text language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  perform automation_guard(p_secret);
  select * into c from cleaners where lower(email) = lower(trim(coalesce(p_email, ''))) and status = 'actif';
  if not found then return null; end if;
  if c.token_set_at is not null and c.token_set_at > now() - interval '5 minutes' then return 'trop_tot'; end if;
  update cleaners set token_hash = p_token_hash, token_set_at = now() where id = c.id;
  return c.full_name;
end $$;

-- Synchronisation des calendriers au plus toutes les N minutes (déclenchée par la tâche quotidienne et par l'ouverture de l'application).
create or replace function automation_claim_sync(p_secret text, p_minutes int) returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  perform automation_guard(p_secret);
  update marketplace_settings set last_sync_at = now() where last_sync_at is null or last_sync_at < now() - make_interval(mins => greatest(p_minutes, 1)) returning true into ok;
  return coalesce(ok, false);
end $$;

create or replace function automation_concierge_listings(p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'ical_url', ical_url, 'platform', platform)) from concierge_listings where ical_url is not null and auto_cleaning), '[]'::jsonb);
end $$;

create or replace function automation_listing_sync_error(p_secret text, p_listing uuid, p_error text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  update concierge_listings set last_sync_at = now(), last_sync_error = left(p_error, 160) where id = p_listing;
end $$;

-- Applique les réservations d'un logement : séjours ajoutés / mis à jour / annulés, et un ménage (à pourvoir) à chaque départ, déplacé ou annulé avec le séjour.
create or replace function automation_concierge_apply(p_secret text, p_listing uuid, p_events jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare l record; today date := (now() at time zone 'Europe/Paris')::date; uids text[]; s record; iid uuid; ex record; urgent boolean; has_ex boolean; ttl text; n_new int := 0; n_moved int := 0; n_gone int := 0;
begin
  perform automation_guard(p_secret);
  select * into l from concierge_listings where id = p_listing;
  if not found then return jsonb_build_object('created', 0); end if;
  select coalesce(array_agg(e ->> 'uid'), '{}') into uids from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) e;
  insert into concierge_stays(listing_id, uid, check_in, check_out, summary, cancelled, updated_at)
  select p_listing, e ->> 'uid', (e ->> 'checkIn')::date, (e ->> 'checkOut')::date, nullif(e ->> 'summary', ''), false, now() from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) e
  on conflict (listing_id, uid) do update set check_in = excluded.check_in, check_out = excluded.check_out, summary = excluded.summary, cancelled = false, updated_at = now();
  update concierge_stays cs set cancelled = true, updated_at = now() where cs.listing_id = p_listing and not cs.cancelled and cs.check_out >= today and not (cs.uid = any(uids));
  update concierge_listings set last_sync_at = now(), last_sync_error = null where id = p_listing;
  if not l.auto_cleaning or exists (select 1 from concierge_automations where key = 'menages' and not enabled) then return jsonb_build_object('created', 0, 'moved', 0, 'cancelled', 0); end if;

  for s in select * from concierge_stays where listing_id = p_listing and check_out between today and today + 60 order by check_out loop
    select * into ex from interventions where source_key = 'conc:' || s.id;
    has_ex := found;
    if s.cancelled then
      if has_ex and ex.stage in ('brouillon', 'planifiee', 'affectee') then
        update interventions set stage = 'annulee' where id = ex.id; n_gone := n_gone + 1;
        update cleaning_jobs set status = 'annulee' where intervention_id = ex.id and status in ('ouverte', 'acceptee', 'a_reprendre');
      end if;
      continue;
    end if;
    urgent := exists (select 1 from concierge_stays o where o.listing_id = p_listing and o.id <> s.id and not o.cancelled and o.check_in = s.check_out);
    ttl := 'Ménage — ' || l.name || case when urgent then ' (arrivée le même jour)' else '' end;
    if not has_ex then
      insert into interventions(client_id, contract_id, site_id, title, scheduled_date, start_time, duration_hours, staff_id, quantity, unit_price_ht, vat_rate, billable, source_key, stage, activity)
      values (l.client_id, l.contract_id, l.site_id, ttl, s.check_out, l.checkout_time, l.cleaning_hours, l.staff_id, 1, case when coalesce(l.cleaning_price_ht, 0) > 0 then l.cleaning_price_ht end, 20, coalesce(l.cleaning_price_ht, 0) > 0,
              'conc:' || s.id, case when l.staff_id is not null then 'affectee' else 'planifiee' end, 'nettoyage_airbnb') returning id into iid;
      update concierge_stays set intervention_id = iid where id = s.id;
      n_new := n_new + 1;
    elsif ex.stage in ('brouillon', 'planifiee', 'affectee') and (ex.scheduled_date <> s.check_out or ex.title <> ttl or left(coalesce(ex.start_time::text, ''), 5) <> left(l.checkout_time::text, 5)) then
      update interventions set scheduled_date = s.check_out, start_time = l.checkout_time, title = ttl where id = ex.id;
      update cleaning_jobs set job_date = s.check_out, title = ttl where intervention_id = ex.id and status in ('ouverte', 'acceptee');
      n_moved := n_moved + 1;
    end if;
  end loop;
  return jsonb_build_object('created', n_new, 'moved', n_moved, 'cancelled', n_gone);
end $$;

create or replace function automation_jobs_to_geocode(p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'address', x.address, 'postal_code', x.postal_code, 'city', x.city)) from (select id, address, postal_code, city from cleaning_jobs where status = 'ouverte' and lat is null and postal_code is not null and job_date >= (now() at time zone 'Europe/Paris')::date order by job_date limit 30) x), '[]'::jsonb);
end $$;

create or replace function automation_set_job_geo(p_secret text, p_job uuid, p_lat double precision, p_lng double precision) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  if p_lat between 41 and 52 and p_lng between -6 and 10 then update cleaning_jobs set lat = p_lat, lng = p_lng where id = p_job; end if;
end $$;

-- Ménages encore sans nettoyeur à l'approche de la date (pour l'e-mail d'alerte quotidien).
create or replace function automation_unfilled_jobs(p_secret text, p_days int) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'date', job_date, 'city', city) order by job_date)
    from cleaning_jobs where status = 'ouverte' and job_date between (now() at time zone 'Europe/Paris')::date and (now() at time zone 'Europe/Paris')::date + greatest(p_days, 0)), '[]'::jsonb);
end $$;

-- Le formulaire d'inscription public n'écrit plus directement : tout passe par le serveur (contrôle du SIRET).
revoke execute on function cleaner_signup(jsonb) from anon, authenticated;

do $$ declare f text; begin
  foreach f in array array['cleaner_open_jobs(text)', 'cleaner_accept_job(text,uuid)', 'cleaner_overview(text)', 'cleaner_update_profile2(text,text,text,text,double precision,double precision,int,text,text)',
                           'automation_cleaner_register(text,jsonb,text)', 'automation_cleaner_new_link(text,text,text)', 'automation_claim_sync(text,int)', 'automation_concierge_listings(text)',
                           'automation_listing_sync_error(text,uuid,text)', 'automation_concierge_apply(text,uuid,jsonb)', 'automation_jobs_to_geocode(text)', 'automation_set_job_geo(text,uuid,double precision,double precision)', 'automation_unfilled_jobs(text,int)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
