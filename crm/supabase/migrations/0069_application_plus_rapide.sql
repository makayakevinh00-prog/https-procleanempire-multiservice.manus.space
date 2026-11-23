-- 0069 — Application nettoyeur « aussi rapide qu'un VTC » : offre réservée avec compte à rebours, score de fiabilité visible,
-- acceptation automatique des réservations simples (réglable, coupée par défaut), suivi de la demande par le client (lien privé),
-- et distribution qui tourne seule chaque minute, même quand aucun écran n'est ouvert.
-- Rejouable. Rien n'est envoyé ni payé par cette migration.

-- ───────────── Réglage et colonnes ─────────────
alter table marketplace_settings add column if not exists auto_accept_bookings boolean not null default false;

-- Lien de suivi du client : un jeton par réservation. Lecture seule, par la fonction booking_track uniquement.
alter table cleaning_bookings add column if not exists track_token text;
update cleaning_bookings set track_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') where track_token is null;
alter table cleaning_bookings alter column track_token set default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
alter table cleaning_bookings alter column track_token set not null;
create unique index if not exists cleaning_bookings_track_uq on cleaning_bookings (track_token);
alter table cleaning_bookings add column if not exists auto_accepted boolean not null default false;

-- ───────────── Offre réservée : le nettoyeur voit jusqu'à quand la demande n'est proposée qu'aux mieux placés ─────────────
-- Mêmes vagues que dispatch_wave_size : 3 meilleurs pendant 2 min, 10 meilleurs jusqu'à 5 min, ensuite toute la zone (plus de réserve).
create or replace function cleaner_open_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  return jsonb_build_object('jobs', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'date', x.job_date, 'window_start', x.window_start, 'window_end', x.window_end, 'hours', x.duration_hours,
        'city', x.city, 'postal_code', x.postal_code, 'amount', x.cleaner_amount, 'distance_km', x.km,
        'favorite', x.fav, 'priority_until', case when x.priority_until > now() then x.priority_until else null end, 'rank', x.rk,
        'reserved_until', case when x.rk is null then null
                               when now() - x.created_at < interval '2 minutes' then x.created_at + interval '2 minutes'
                               when now() - x.created_at < interval '5 minutes' then x.created_at + interval '5 minutes' end,
        'reserved_for', case when x.rk is null then null
                             when now() - x.created_at < interval '2 minutes' then 3
                             when now() - x.created_at < interval '5 minutes' then 10 end) order by x.job_date, x.km nulls last, x.window_start)
      from (select j.*, case when c.lat is not null and j.lat is not null then round(geo_km(case when c.last_seen_at > now() - interval '10 minutes' and c.last_lat is not null then c.last_lat else c.lat end, case when c.last_seen_at > now() - interval '10 minutes' and c.last_lat is not null then c.last_lng else c.lng end, j.lat, j.lng)::numeric, 1) end as km,
                   exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) as fav,
                   case when c.online then dispatch_rank(c, j) end as rk
              from cleaning_jobs j where j.status = 'ouverte' and j.job_date >= today and dispatch_visible(c, j)) x
     where (x.priority_until is null or x.priority_until <= now() or x.fav)), '[]'::jsonb));
end $$;

-- ───────────── Score de fiabilité : ce que le nettoyeur voit de lui-même ─────────────
-- Ménages validés du premier coup, sur l'ensemble des ménages terminés ou manqués. Refuser une demande ne compte jamais.
-- Affiché à partir de 3 ménages comptés (avant, le chiffre ne veut rien dire).
create or replace function cleaner_reliability(c cleaners) returns jsonb language sql stable as $$
  with n as (
    select (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee' and j.review_note is null)::int as clean,
           (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.review_note is not null)::int as redo,
           (select count(*) from cleaning_noshows s where s.cleaner_id = c.id)::int as missed)
  select jsonb_build_object('clean', clean, 'redo', redo, 'missed', missed,
                            'score', case when clean + redo + missed >= 3 then round(100.0 * clean / (clean + redo + missed))::int end) from n
$$;

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
    'reliability', cleaner_reliability(c),
    'done', (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee'),
    'today_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre', 'validee') and j.job_date = today), 0),
    'week_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre', 'validee') and j.job_date between mon and mon + 6), 0),
    'pending_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), 0),
    'to_pay_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee' and j.payout_id is null), 0),
    'in_payout_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'a_payer'), 0),
    'paid_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'paye'), 0),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('period_start', p.period_start, 'period_end', p.period_end, 'amount', p.amount, 'jobs', p.jobs, 'status', p.status, 'paid_on', p.paid_on) order by p.period_end desc) from (select * from cleaning_payouts where cleaner_id = c.id order by period_end desc limit 24) p), '[]'::jsonb));
end $$;

-- ───────────── Suivi de la demande par le client ─────────────
-- Réservation + jeton de suivi rendu à la personne qui vient de réserver (les contrôles restent ceux de book_cleaning).
create or replace function book_cleaning_tracked(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  perform book_cleaning(p);
  select track_token into t from cleaning_bookings where lower(email) = lower(trim(coalesce(p ->> 'email', ''))) order by created_at desc, id desc limit 1;
  return t;
end $$;

-- Où en est ma demande ? Rien de privé : ni adresse, ni moyen d'accès, ni nom complet du nettoyeur.
create or replace function booking_track(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  select jsonb_build_object('status', b.status, 'kind', b.kind, 'date', b.job_date, 'city', b.city, 'postal_code', b.postal_code, 'price_ht', b.price_ht,
           'window_start', coalesce(j.window_start, s.window_start), 'window_end', coalesce(j.window_end, s.window_end),
           'job_status', j.status, 'cleaner', case when j.cleaner_id is not null then split_part(trim(c.full_name), ' ', 1) end,
           'arrived_at', j.arrived_at, 'created_at', b.created_at) into r
    from cleaning_bookings b left join cleaning_jobs j on j.id = b.job_id left join cleaners c on c.id = j.cleaner_id
         left join lateral (select window_start, window_end from marketplace_settings limit 1) s on true
   where b.track_token = p_token;
  if r is null then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  return r;
end $$;

-- ───────────── Acceptation automatique des réservations simples ─────────────
-- Simple = réglage activé, demande en attente, date à venir, prix du barème, aucune précision écrite par le client.
-- Tout le reste attend la décision du patron, comme avant.
create or replace function booking_auto_ok(b cleaning_bookings) returns boolean language sql stable as $$
  select coalesce((select auto_accept_bookings from marketplace_settings limit 1), false)
     and b.status = 'nouvelle' and b.job_date > (now() at time zone 'Europe/Paris')::date and b.note is null
     and b.price_ht = (select case b.kind when 'studio' then price_studio when 't2' then price_t2 when 't3' then price_t3 when 'maison' then price_maison end from marketplace_settings limit 1)
$$;

-- Un nettoyeur actif couvre-t-il cette adresse ? Rayon si les deux positions sont connues, sinon même département.
create or replace function booking_covered(p_postal text, p_lat double precision, p_lng double precision) returns boolean language sql stable as $$
  select exists (select 1 from cleaners c where c.status = 'actif' and (
    case when c.lat is not null and p_lat is not null then geo_km(c.lat, c.lng, p_lat, p_lng) <= c.radius_km
         else exists (select 1 from unnest(c.departments) d where left(coalesce(p_postal, ''), length(d)) = d)
              or (c.postal_code is not null and left(c.postal_code, 2) = left(coalesce(p_postal, ''), 2)) end))
$$;

-- Réservations que le serveur peut accepter seul (il les localise, puis appelle automation_accept_booking une par une).
create or replace function automation_bookings_to_accept(p_secret text) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'address', b.address, 'postal_code', b.postal_code, 'city', b.city) order by b.created_at)
                     from cleaning_bookings b where booking_auto_ok(b) and booking_covered(b.postal_code, null, null)), '[]'::jsonb);
end $$;

-- Accepte une réservation simple : client retrouvé (e-mail) ou créé, ménage publié aux nettoyeurs. Jamais un contact réservé, jamais hors zone.
create or replace function automation_accept_booking(p_secret text, p_id uuid, p_lat double precision, p_lng double precision) returns jsonb language plpgsql security definer set search_path = public as $$
declare b cleaning_bookings; s marketplace_settings; v_client uuid; v_reserved boolean; v_job uuid; v_label text;
begin
  perform automation_guard(p_secret);
  select * into b from cleaning_bookings where id = p_id for update;
  if not found or not booking_auto_ok(b) then return jsonb_build_object('accepted', false, 'reason', 'regles'); end if;
  if not booking_covered(b.postal_code, p_lat, p_lng) then return jsonb_build_object('accepted', false, 'reason', 'zone'); end if;
  select * into s from marketplace_settings limit 1;
  select id, is_reserved into v_client, v_reserved from clients where lower(email) = lower(b.email) order by created_at limit 1;
  if v_reserved then return jsonb_build_object('accepted', false, 'reason', 'contact_reserve'); end if;
  if v_client is null then
    begin
      insert into clients(name, kind, status, email, phone, address, postal_code, city) values (b.name, 'particulier', 'actif', b.email, b.phone, b.address, b.postal_code, b.city) returning id into v_client;
    exception when unique_violation then
      return jsonb_build_object('accepted', false, 'reason', 'client_existant');
    end;
  end if;
  v_label := case b.kind when 'studio' then 'Studio' when 't2' then '2 pièces' when 't3' then '3 pièces' when 'maison' then 'Maison' else b.kind end;
  insert into cleaning_jobs(lat, lng, client_id, title, job_date, window_start, window_end, city, postal_code, address, access_notes, price_ht)
  values (p_lat, p_lng, v_client, 'Ménage — ' || v_label || ' (' || b.city || ')', b.job_date, coalesce(s.window_start, '11:00'), coalesce(s.window_end, '14:00'), b.city, b.postal_code, b.address, b.access_notes, b.price_ht)
  returning id into v_job;
  update cleaning_bookings set status = 'acceptee', job_id = v_job, auto_accepted = true where id = b.id;
  return jsonb_build_object('accepted', true, 'job_id', v_job, 'name', b.name, 'email', b.email, 'kind', b.kind, 'label', v_label, 'date', b.job_date,
    'address', b.address, 'postal_code', b.postal_code, 'city', b.city, 'price_ht', b.price_ht,
    'window_start', coalesce(s.window_start, '11:00'), 'window_end', coalesce(s.window_end, '14:00'), 'track_token', b.track_token);
end $$;

do $$ declare f text; begin
  foreach f in array array['book_cleaning_tracked(jsonb)', 'booking_track(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
  foreach f in array array['automation_bookings_to_accept(text)', 'automation_accept_booking(text, uuid, double precision, double precision)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

-- ───────────── Distribution qui tourne seule ─────────────
-- Chaque minute, la base appelle le travail de fond de l'application (calendriers, vagues, notifications, rappels).
-- Le passage est déjà cadencé côté application : un appel de trop ne fait rien. Sans les extensions (base de test), cette partie est ignorée.
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron with schema pg_catalog;
    create extension if not exists pg_net with schema extensions;
    perform cron.unschedule(jobid) from cron.job where jobname = 'nettoyeur-tick';
    perform cron.schedule('nettoyeur-tick', '* * * * *', $job$ select net.http_post(url := 'https://proclean-crm.vercel.app/api/nettoyeur/tick', body := '{}'::jsonb, timeout_milliseconds := 25000) $job$);
  end if;
end $$;
