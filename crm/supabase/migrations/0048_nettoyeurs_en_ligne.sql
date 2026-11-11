-- 0048 — Application nettoyeur « comme les chauffeurs Uber » : bouton En ligne / Hors ligne, zones de demande, notifications (push + e-mail), gains du jour.
alter table cleaners add column if not exists online boolean not null default false;
alter table cleaners add column if not exists online_at timestamptz;
alter table cleaners add column if not exists notify_email boolean not null default true;
alter table cleaners add column if not exists last_lat double precision;
alter table cleaners add column if not exists last_lng double precision;
alter table cleaners add column if not exists last_seen_at timestamptz;
alter table marketplace_settings add column if not exists last_tick_at timestamptz;

-- Abonnements aux notifications d'un téléphone. Aucune lecture directe : tout passe par les fonctions ci-dessous.
create table if not exists cleaner_push (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 300),
  auth text not null check (length(auth) <= 100),
  created_at timestamptz not null default now()
);
alter table cleaner_push enable row level security;
revoke all on cleaner_push from anon, authenticated;

-- Distribution à l'Uber. Un ménage est d'abord proposé aux meilleurs candidats EN LIGNE, puis à plus de monde si personne n'accepte.
create table if not exists cleaning_offers (
  job_id uuid not null references cleaning_jobs(id) on delete cascade,
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  rank int not null,
  offered_at timestamptz not null default now(),
  primary key (job_id, cleaner_id)
);
alter table cleaning_offers enable row level security;
revoke all on cleaning_offers from anon, authenticated;
drop policy if exists cleaning_offers_owner on cleaning_offers;
create policy cleaning_offers_owner on cleaning_offers for select to authenticated using (is_owner());
grant select on cleaning_offers to authenticated;

-- Éligible : actif, dans sa zone, et libre sur ce créneau (pas déjà un ménage qui se chevauche).
create or replace function dispatch_eligible(c cleaners, j cleaning_jobs) returns boolean language sql stable as $$
  select c.status = 'actif' and cleaner_covers(c, j) and not exists (
    select 1 from cleaning_jobs o where o.cleaner_id = c.id and o.id <> j.id and o.job_date = j.job_date and o.status in ('acceptee', 'a_verifier', 'a_reprendre') and o.window_start < j.window_end and j.window_start < o.window_end)
$$;
-- Score (plus petit = meilleur) : distance depuis sa position récente (sinon son adresse), favori du propriétaire, fiabilité (ménages validés sans reprise).
create or replace function dispatch_score(c cleaners, j cleaning_jobs) returns double precision language sql stable as $$
  select coalesce(case when j.lat is not null and coalesce(c.last_lat, c.lat) is not null
                       then geo_km(case when c.last_seen_at > now() - interval '10 minutes' and c.last_lat is not null then c.last_lat else coalesce(c.lat, c.last_lat) end,
                                   case when c.last_seen_at > now() - interval '10 minutes' and c.last_lat is not null then c.last_lng else coalesce(c.lng, c.last_lng) end, j.lat, j.lng) end, 15)
       - case when exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) then 6 else 0 end
       - 5 * (select (count(*) filter (where o.status = 'validee') + 1.0) / (count(*) filter (where o.status = 'validee') + count(*) filter (where o.review_note is not null) + 2.0) from cleaning_jobs o where o.cleaner_id = c.id)
$$;
-- Rang parmi les nettoyeurs en ligne éligibles (1 = le mieux placé).
create or replace function dispatch_rank(c cleaners, j cleaning_jobs) returns int language sql stable as $$
  select 1 + (select count(*)::int from cleaners o where o.id <> c.id and o.online and dispatch_eligible(o, j)
              and (dispatch_score(o, j) < dispatch_score(c, j) or (dispatch_score(o, j) = dispatch_score(c, j) and o.id < c.id)))
$$;
-- Vagues : 3 meilleurs pendant 2 min, 10 meilleurs jusqu'à 5 min, ensuite tous les nettoyeurs de la zone.
create or replace function dispatch_wave_size(j cleaning_jobs) returns int language sql stable as $$
  select case when now() - j.created_at < interval '2 minutes' then 3 when now() - j.created_at < interval '5 minutes' then 10 else 100000 end
$$;
create or replace function dispatch_visible(c cleaners, j cleaning_jobs) returns boolean language sql stable as $$
  select dispatch_eligible(c, j) and (now() - j.created_at >= interval '5 minutes' or (c.online and dispatch_rank(c, j) <= dispatch_wave_size(j)))
$$;
revoke all on function dispatch_eligible(cleaners, cleaning_jobs), dispatch_score(cleaners, cleaning_jobs), dispatch_rank(cleaners, cleaning_jobs), dispatch_wave_size(cleaning_jobs), dispatch_visible(cleaners, cleaning_jobs) from public, anon, authenticated;

create or replace function cleaner_open_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  return jsonb_build_object('jobs', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'date', x.job_date, 'window_start', x.window_start, 'window_end', x.window_end, 'hours', x.duration_hours,
        'city', x.city, 'postal_code', x.postal_code, 'amount', x.cleaner_amount, 'distance_km', x.km,
        'favorite', x.fav, 'priority_until', case when x.priority_until > now() then x.priority_until else null end, 'rank', x.rk) order by x.job_date, x.km nulls last, x.window_start)
      from (select j.*, case when c.lat is not null and j.lat is not null then round(geo_km(case when c.last_seen_at > now() - interval '10 minutes' and c.last_lat is not null then c.last_lat else c.lat end, case when c.last_seen_at > now() - interval '10 minutes' and c.last_lat is not null then c.last_lng else c.lng end, j.lat, j.lng)::numeric, 1) end as km,
                   exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) as fav,
                   case when c.online then dispatch_rank(c, j) end as rk
              from cleaning_jobs j where j.status = 'ouverte' and j.job_date >= today and dispatch_visible(c, j)) x
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
  if not dispatch_eligible(c, j) then raise exception 'INDISPONIBLE: vous avez déjà un ménage sur ce créneau'; end if;
  if not dispatch_visible(c, j) then raise exception 'INDISPONIBLE: ce ménage est d''abord proposé à d''autres nettoyeurs, mieux placés'; end if;
  select exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) into fav;
  if j.priority_until is not null and j.priority_until > now() and not fav then raise exception 'INDISPONIBLE: ce ménage est d''abord proposé aux favoris du propriétaire'; end if;
  update cleaning_jobs set status = 'acceptee', cleaner_id = c.id, accepted_at = now() where id = j.id;
  if j.intervention_id is not null then update interventions set assignee = c.full_name where id = j.intervention_id; end if;
  return jsonb_build_object('ok', true, 'title', j.title, 'date', j.job_date, 'city', j.city, 'name', c.full_name, 'amount', j.cleaner_amount);
end $$;

-- Position en direct (envoyée par l'application ouverte, jamais en arrière-plan).
create or replace function cleaner_ping(p_token text, p_lat double precision, p_lng double precision) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  if p_lat is null or p_lng is null or p_lat not between 41 and 52 or p_lng not between -6 and 10 then raise exception 'ARGUMENT: position hors de France métropolitaine'; end if;
  update cleaners set last_lat = p_lat, last_lng = p_lng, last_seen_at = now() where id = c.id;
end $$;

create or replace function cleaner_set_online(p_token text, p_online boolean) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  update cleaners set online = coalesce(p_online, false), online_at = case when coalesce(p_online, false) then now() end where id = c.id;
end $$;

create or replace function cleaner_push_subscribe(p_token text, p_endpoint text, p_p256dh text, p_auth text) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  if coalesce(p_endpoint, '') !~ '^https://' or length(p_endpoint) > 1000 or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then raise exception 'ARGUMENT: abonnement invalide'; end if;
  delete from cleaner_push where cleaner_id = c.id and id not in (select id from cleaner_push where cleaner_id = c.id order by created_at desc limit 4);
  insert into cleaner_push(cleaner_id, endpoint, p256dh, auth) values (c.id, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set cleaner_id = excluded.cleaner_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end $$;

create or replace function cleaner_push_status(p_token text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  return exists (select 1 from cleaner_push where cleaner_id = c.id);
end $$;

-- Zones de demande : là où des ménages attendent un nettoyeur, et là où des logements sont gérés (la demande y arrivera).
create or replace function cleaner_zones(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('postal_code', z.postal, 'city', z.city, 'open_jobs', z.n, 'listings', z.l, 'avg_amount', z.avg_amount, 'lat', z.lat, 'lng', z.lng,
      'km', case when c.lat is not null and z.lat is not null then round(geo_km(c.lat, c.lng, z.lat, z.lng)::numeric, 1) end) order by z.n desc, z.l desc, z.city)
    from (
      select coalesce(a.postal, b.postal) postal, coalesce(a.city, b.city) city, coalesce(a.n, 0) n, coalesce(b.l, 0) l, a.avg_amount, a.lat, a.lng
        from (select postal_code postal, max(city) city, count(*)::int n, round(avg(cleaner_amount)::numeric, 0) avg_amount, avg(lat) lat, avg(lng) lng from cleaning_jobs where status = 'ouverte' and job_date >= today and postal_code is not null group by postal_code) a
        full join (select coalesce(s.postal_code, cl.postal_code) postal, max(coalesce(s.city, cl.city)) city, count(*)::int l from concierge_listings li join clients cl on cl.id = li.client_id left join sites s on s.id = li.site_id
                    where not cl.is_reserved and coalesce(s.postal_code, cl.postal_code) is not null group by coalesce(s.postal_code, cl.postal_code)) b on b.postal = a.postal
      order by coalesce(a.n, 0) desc, coalesce(b.l, 0) desc limit 8) z), '[]'::jsonb);
end $$;

-- Choisir une zone : le centre de travail devient cette zone (le rayon reste le sien).
create or replace function cleaner_set_zone(p_token text, p_postal text, p_city text, p_lat double precision, p_lng double precision) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  if coalesce(p_postal, '') !~ '^\d{5}$' then raise exception 'ARGUMENT: code postal à 5 chiffres obligatoire'; end if;
  if (p_lat is null) <> (p_lng is null) or (p_lat is not null and (p_lat not between 41 and 52 or p_lng not between -6 and 10)) then raise exception 'ARGUMENT: position hors de France métropolitaine'; end if;
  update cleaners set postal_code = p_postal, city = left(nullif(trim(coalesce(p_city, '')), ''), 100), lat = p_lat, lng = p_lng, address_line = null,
         departments = array[left(p_postal, case when left(p_postal, 2) in ('97', '98') then 3 else 2 end)] where id = c.id;
end $$;

-- Aperçu : ajoute l'état En ligne, les gains du jour et de la semaine.
create or replace function cleaner_overview(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; s marketplace_settings; today date := (now() at time zone 'Europe/Paris')::date; mon date;
begin
  c := cleaner_by_token(p_token);
  mon := today - (extract(isodow from today)::int - 1);
  select * into s from marketplace_settings limit 1;
  return jsonb_build_object('name', c.full_name, 'email', c.email, 'phone', c.phone, 'departments', c.departments, 'city', c.city, 'has_iban', c.iban is not null,
    'address_line', c.address_line, 'postal_code', c.postal_code, 'radius_km', c.radius_km, 'has_location', c.lat is not null, 'online', c.online,
    'iban_hint', case when c.iban is null then null else '•••• ' || right(c.iban, 4) end,
    'window_start', s.window_start, 'window_end', s.window_end, 'max_end', s.max_end,
    'done', (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee'),
    'today_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre', 'validee') and j.job_date = today), 0),
    'week_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre', 'validee') and j.job_date between mon and mon + 6), 0),
    'pending_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), 0),
    'to_pay_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee' and j.payout_id is null), 0),
    'in_payout_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'a_payer'), 0),
    'paid_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'paye'), 0),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('period_start', p.period_start, 'period_end', p.period_end, 'amount', p.amount, 'jobs', p.jobs, 'status', p.status, 'paid_on', p.paid_on) order by p.period_end desc) from (select * from cleaning_payouts where cleaner_id = c.id order by period_end desc limit 24) p), '[]'::jsonb));
end $$;

-- ───────────── Serveur seulement (secret) ─────────────

-- Nouveaux ménages à annoncer, par vagues : pour chacun, les nettoyeurs EN LIGNE qui deviennent éligibles (jamais deux fois le même).
create or replace function automation_pending_notifications(p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb := '[]'::jsonb; j cleaning_jobs; t jsonb; today date := (now() at time zone 'Europe/Paris')::date;
begin
  perform automation_guard(p_secret);
  for j in select * from cleaning_jobs where status = 'ouverte' and job_date >= today order by created_at limit 50 for update skip locked loop
    with newly as (
      insert into cleaning_offers(job_id, cleaner_id, rank)
      select j.id, c.id, dispatch_rank(c, j) from cleaners c
       where c.status = 'actif' and c.online and dispatch_eligible(c, j) and dispatch_rank(c, j) <= dispatch_wave_size(j)
         and (j.priority_until is null or j.priority_until <= now() or exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id))
      on conflict do nothing returning cleaner_id
    )
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.full_name, 'email', c.email, 'notify_email', c.notify_email,
        'km', case when j.lat is not null and coalesce(c.last_lat, c.lat) is not null then round(geo_km(coalesce(c.last_lat, c.lat), coalesce(c.last_lng, c.lng), j.lat, j.lng)::numeric, 1) end,
        'push', coalesce((select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)) from cleaner_push p where p.cleaner_id = c.id), '[]'::jsonb))), '[]'::jsonb)
      into t from cleaners c join newly n on n.cleaner_id = c.id;
    if jsonb_array_length(t) > 0 then
      out := out || jsonb_build_array(jsonb_build_object('job', jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'city', j.city, 'amount', j.cleaner_amount), 'targets', t));
    end if;
  end loop;
  return out;
end $$;

-- Cadence : au plus un passage de distribution toutes les N secondes (déclenché par l'ouverture des écrans en direct).
create or replace function automation_claim_tick(p_secret text, p_seconds int) returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  perform automation_guard(p_secret);
  update marketplace_settings set last_tick_at = now() where last_tick_at is null or last_tick_at < now() - make_interval(secs => greatest(p_seconds, 5)) returning true into ok;
  return coalesce(ok, false);
end $$;

create or replace function automation_drop_push(p_secret text, p_endpoint text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  delete from cleaner_push where endpoint = p_endpoint;
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_set_online(text,boolean)', 'cleaner_push_subscribe(text,text,text,text)', 'cleaner_push_status(text)', 'cleaner_zones(text)', 'cleaner_set_zone(text,text,text,double precision,double precision)', 'cleaner_overview(text)', 'cleaner_open_jobs(text)', 'cleaner_accept_job(text,uuid)', 'cleaner_ping(text,double precision,double precision)',
                           'automation_pending_notifications(text)', 'automation_claim_tick(text,int)', 'automation_drop_push(text,text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
