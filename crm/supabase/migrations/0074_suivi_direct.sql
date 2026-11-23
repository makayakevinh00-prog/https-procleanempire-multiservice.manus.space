-- Suivi en direct d'un ménage : trajet du nettoyeur vers le logement, heure d'arrivée estimée, rappel de départ.
-- La position n'est enregistrée et montrée que le jour du ménage, entre le départ et l'arrivée sur place. Rien avant, rien après.
alter table cleaning_jobs add column if not exists trip_started_at timestamptz;
alter table cleaning_jobs add column if not exists eta_minutes int;
alter table cleaning_jobs add column if not exists eta_at timestamptz;
alter table cleaning_jobs add column if not exists eta_updated_at timestamptz;
alter table cleaning_jobs add column if not exists eta_source text;
alter table cleaning_jobs add column if not exists depart_reminded_at timestamptz;

create table if not exists cleaner_trail (
  id bigint generated always as identity primary key,
  job_id uuid not null references cleaning_jobs(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  at timestamptz not null default now()
);
create index if not exists cleaner_trail_job_idx on cleaner_trail (job_id, at);
alter table cleaner_trail enable row level security;
revoke all on cleaner_trail from anon, authenticated;

-- Le ménage en route d'un nettoyeur : accepté, aujourd'hui, pas encore arrivé, à moins de 3 h du début du créneau.
create or replace function cleaner_trip_job(p_cleaner uuid) returns cleaning_jobs language sql stable security definer set search_path = public as $$
  select j.* from cleaning_jobs j
   where j.cleaner_id = p_cleaner and j.status = 'acceptee' and j.arrived_at is null
     and j.job_date = (now() at time zone 'Europe/Paris')::date
     and (now() at time zone 'Europe/Paris') >= (j.job_date + j.window_start) - interval '3 hours'
     and (now() at time zone 'Europe/Paris') < (j.job_date + j.window_end)
   order by j.window_start limit 1;
$$;
revoke all on function cleaner_trip_job(uuid) from public, anon, authenticated;

-- Position du téléphone : comme cleaner_ping, et en plus un point de trajet si un ménage est en route (au plus un point toutes les 20 s).
-- Renvoie ce qu'il faut pour recalculer l'heure d'arrivée (au plus une fois toutes les 2 minutes).
create or replace function cleaner_trip_ping(p_token text, p_lat double precision, p_lng double precision) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs;
begin
  c := cleaner_by_token(p_token);
  if p_lat is null or p_lng is null or p_lat not between 41 and 52 or p_lng not between -6 and 10 then raise exception 'ARGUMENT: position hors de France métropolitaine'; end if;
  update cleaners set last_lat = p_lat, last_lng = p_lng, last_seen_at = now() where id = c.id;
  j := cleaner_trip_job(c.id);
  if j.id is null then return null; end if;
  if not exists (select 1 from cleaner_trail t where t.job_id = j.id and t.at > now() - interval '20 seconds') then
    insert into cleaner_trail(job_id, lat, lng) values (j.id, p_lat, p_lng);
  end if;
  if j.trip_started_at is null then update cleaning_jobs set trip_started_at = now() where id = j.id; end if;
  return jsonb_build_object('job', j.id, 'dest_lat', j.lat, 'dest_lng', j.lng,
    'need_eta', j.lat is not null and (j.eta_updated_at is null or j.eta_updated_at < now() - interval '2 minutes'));
end $$;

create or replace function cleaner_set_eta(p_token text, p_job uuid, p_minutes int, p_source text) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  if p_minutes is null or p_minutes < 0 or p_minutes > 600 then raise exception 'ARGUMENT: durée invalide'; end if;
  update cleaning_jobs set eta_minutes = p_minutes, eta_at = now() + make_interval(mins => p_minutes), eta_updated_at = now(), eta_source = left(coalesce(p_source, ''), 20)
   where id = p_job and cleaner_id = c.id and status = 'acceptee' and arrived_at is null;
end $$;

-- Écran du nettoyeur : son ménage du jour à rejoindre (pour le bouton « Je pars »).
create or replace function cleaner_trip(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs;
begin
  c := cleaner_by_token(p_token);
  j := cleaner_trip_job(c.id);
  if j.id is null then return null; end if;
  return jsonb_build_object('job', j.id, 'title', j.title, 'city', j.city, 'start', to_char(j.window_start, 'HH24:MI'), 'started', j.trip_started_at is not null,
    'eta_at', j.eta_at, 'eta_minutes', j.eta_minutes, 'has_dest', j.lat is not null);
end $$;

-- Ce qu'on montre du trajet. La position et le tracé ne sortent que pendant le trajet ; une fois sur place, seulement l'heure d'arrivée.
create or replace function job_live(j cleaning_jobs) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; moving boolean;
begin
  if j.id is null then return null; end if;
  select * into c from cleaners where id = j.cleaner_id;
  moving := j.status = 'acceptee' and j.job_date = today and j.arrived_at is null and j.trip_started_at is not null and c.last_seen_at > now() - interval '10 minutes';
  return jsonb_build_object('job', j.id, 'title', j.title, 'status', j.status, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end,
    'cleaner', case when c.id is not null then split_part(trim(c.full_name), ' ', 1) end,
    'dest', case when j.lat is not null then jsonb_build_array(j.lat, j.lng) end,
    'arrived_at', j.arrived_at, 'moving', moving,
    'pos', case when moving then jsonb_build_array(c.last_lat, c.last_lng) end,
    'seen_at', case when moving then c.last_seen_at end,
    'eta_at', case when moving then j.eta_at end, 'eta_minutes', case when moving then j.eta_minutes end, 'eta_traffic', coalesce(j.eta_source, '') = 'trafic',
    'trail', case when moving then coalesce((select jsonb_agg(jsonb_build_array(t.lat, t.lng) order by t.at) from (select lat, lng, at from cleaner_trail where job_id = j.id order by at desc limit 400) t), '[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function job_live(cleaning_jobs) from public, anon, authenticated;

-- Client qui a réservé : par son lien de suivi.
create or replace function booking_live(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare j cleaning_jobs;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  select cj.* into j from cleaning_bookings b join cleaning_jobs cj on cj.id = b.job_id where b.track_token = p_token;
  return job_live(j);
end $$;

-- Propriétaire ou conciergerie : les ménages du jour de ses logements.
create or replace function partner_live(p_secret text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret); today date := (now() at time zone 'Europe/Paris')::date;
begin
  return coalesce((select jsonb_agg(job_live(j) order by j.window_start) from cleaning_jobs j
    where j.client_id = cid and j.job_date = today and j.cleaner_id is not null and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), '[]'::jsonb);
end $$;

-- Direction : tous les ménages du jour.
create or replace function admin_live() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/Paris')::date;
begin
  if not is_owner() then raise exception 'ACCES_REFUSE: réservé à la direction'; end if;
  return coalesce((select jsonb_agg(job_live(j) || jsonb_build_object('client', (select name from clients where id = j.client_id), 'cleaner_full', (select full_name from cleaners where id = j.cleaner_id)) order by j.window_start)
    from cleaning_jobs j where j.job_date = today and j.cleaner_id is not null and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), '[]'::jsonb);
end $$;

-- Rappel de départ : ménages acceptés du jour, pas encore partis, à moins de 3 h du début. Le serveur calcule le trajet puis marque l'envoi.
create or replace function automation_departure_candidates(p_secret text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare nowp timestamp := now() at time zone 'Europe/Paris';
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('job', j.id, 'title', j.title, 'city', j.city, 'start', to_char(j.window_start, 'HH24:MI'),
      'minutes_left', floor(extract(epoch from ((j.job_date + j.window_start) - nowp)) / 60)::int,
      'from_lat', case when c.last_seen_at > now() - interval '3 hours' then c.last_lat else c.lat end,
      'from_lng', case when c.last_seen_at > now() - interval '3 hours' then c.last_lng else c.lng end,
      'dest_lat', j.lat, 'dest_lng', j.lng, 'online', c.online, 'name', c.full_name, 'email', c.email,
      'push', coalesce((select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)) from cleaner_push p where p.cleaner_id = c.id), '[]'::jsonb)))
    from cleaning_jobs j join cleaners c on c.id = j.cleaner_id
   where j.status = 'acceptee' and j.job_date = nowp::date and j.arrived_at is null and j.depart_reminded_at is null and j.trip_started_at is null and j.lat is not null
     and nowp >= (j.job_date + j.window_start) - interval '3 hours' and nowp < (j.job_date + j.window_start)), '[]'::jsonb);
end $$;

create or replace function automation_mark_departure(p_secret text, p_job uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  perform automation_guard(p_secret);
  update cleaning_jobs set depart_reminded_at = now() where id = p_job and depart_reminded_at is null returning true into ok;
  return coalesce(ok, false);
end $$;

-- Les points de trajet ne sont gardés que 7 jours.
create or replace function automation_purge_trail(p_secret text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  delete from cleaner_trail where at < now() - interval '7 days';
end $$;

do $$
declare f text;
begin
  foreach f in array array['cleaner_trip_ping(text, double precision, double precision)', 'cleaner_set_eta(text, uuid, int, text)', 'cleaner_trip(text)', 'booking_live(text)', 'partner_live(text)',
                           'admin_live()', 'automation_departure_candidates(text)', 'automation_mark_departure(text, uuid)', 'automation_purge_trail(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
