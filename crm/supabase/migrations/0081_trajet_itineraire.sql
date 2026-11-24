-- Trajet partagé, suite : choix de l'itinéraire (Waze en voiture, Plans en transports) et suivi des agents ProClean.
-- 1. Nettoyeurs indépendants : quand le GPS (Waze, Plans) passe devant l'application, la position n'arrive plus.
--    L'heure d'arrivée reste alors affichée jusqu'à 20 minutes après l'heure prévue, avec l'heure de la dernière position.
-- 2. Agents ProClean : entre « En route » et l'arrivée pointée, la position est partagée de la même façon
--    (direction, et client dans son espace). Table à part : la mission elle-même n'est jamais modifiée par le trajet.

create or replace function job_live(j cleaning_jobs) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; moving boolean;
begin
  if j.id is null then return null; end if;
  select * into c from cleaners where id = j.cleaner_id;
  moving := j.status = 'acceptee' and j.job_date = today and j.arrived_at is null and j.trip_started_at is not null
    and (c.last_seen_at > now() - interval '10 minutes' or j.eta_at > now() - interval '20 minutes');
  return jsonb_build_object('job', j.id, 'title', j.title, 'status', j.status, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end,
    'cleaner', case when c.id is not null then split_part(trim(c.full_name), ' ', 1) end,
    'dest', case when j.lat is not null then jsonb_build_array(j.lat, j.lng) end,
    'arrived_at', j.arrived_at, 'done_at', j.done_at, 'duration_hours', j.duration_hours, 'est_minutes', j.est_minutes,
    'rework_minutes', case when j.status = 'a_reprendre' then j.rework_minutes end, 'moving', moving,
    'pos', case when moving and c.last_lat is not null then jsonb_build_array(c.last_lat, c.last_lng) end,
    'seen_at', case when moving then c.last_seen_at end,
    'eta_at', case when moving then j.eta_at end, 'eta_minutes', case when moving then j.eta_minutes end, 'eta_traffic', coalesce(j.eta_source, '') = 'trafic',
    'mode', case when coalesce(j.eta_source, '') = 'transports' then 'transports' else 'voiture' end,
    'trail', case when moving then coalesce((select jsonb_agg(jsonb_build_array(t.lat, t.lng) order by t.at) from (select lat, lng, at from cleaner_trail where job_id = j.id order by at desc limit 400) t), '[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function job_live(cleaning_jobs) from public, anon, authenticated;

create table if not exists mission_trips (
  intervention_id uuid primary key references interventions(id) on delete cascade,
  started_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  seen_at timestamptz,
  eta_minutes int,
  eta_at timestamptz,
  eta_updated_at timestamptz,
  eta_source text,
  trail jsonb not null default '[]'::jsonb
);
alter table mission_trips enable row level security;
revoke all on mission_trips from anon, authenticated;

-- Position de l'agent en route. Rien n'est enregistré hors du trajet : mission du jour, étape « en route », arrivée pas encore pointée.
create or replace function agent_trip_ping(p_token text, p_id uuid, p_lat double precision, p_lng double precision) returns jsonb language plpgsql security definer set search_path = public as $$
declare a staff; m interventions; s sites; t mission_trips;
begin
  a := agent_by_token(p_token);
  select * into m from interventions where id = p_id and staff_id = a.id;
  if not found then raise exception 'MISSION_INTROUVABLE: cette mission ne vous est pas affectée.'; end if;
  if p_lat is null or p_lng is null or p_lat not between 41 and 52 or p_lng not between -6 and 10 then raise exception 'ARGUMENT: position hors de France métropolitaine'; end if;
  if m.stage::text <> 'en_route' or m.arrived_at is not null or m.scheduled_date <> (now() at time zone 'Europe/Paris')::date then return null; end if;
  insert into mission_trips(intervention_id, lat, lng, seen_at, trail) values (m.id, p_lat, p_lng, now(), jsonb_build_array(jsonb_build_array(p_lat, p_lng)))
  on conflict (intervention_id) do update set lat = excluded.lat, lng = excluded.lng, seen_at = now(),
    trail = case when mission_trips.seen_at is null or mission_trips.seen_at < now() - interval '20 seconds'
                 then (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from (select e, o from jsonb_array_elements(mission_trips.trail || jsonb_build_array(jsonb_build_array(excluded.lat, excluded.lng))) with ordinality x(e, o) order by o desc limit 300) k)
                 else mission_trips.trail end
  returning * into t;
  if m.site_id is not null then select * into s from sites where id = m.site_id; end if;
  return jsonb_build_object('dest_lat', s.lat, 'dest_lng', s.lng, 'need_eta', s.lat is not null and (t.eta_updated_at is null or t.eta_updated_at < now() - interval '2 minutes'));
end $$;

create or replace function agent_trip_eta(p_token text, p_id uuid, p_minutes int, p_source text) returns void language plpgsql security definer set search_path = public as $$
declare a staff;
begin
  a := agent_by_token(p_token);
  if p_minutes is null or p_minutes < 0 or p_minutes > 600 then raise exception 'ARGUMENT: durée invalide'; end if;
  update mission_trips t set eta_minutes = p_minutes, eta_at = now() + make_interval(mins => p_minutes), eta_updated_at = now(), eta_source = left(coalesce(p_source, ''), 20)
    from interventions m where m.id = t.intervention_id and t.intervention_id = p_id and m.staff_id = a.id and m.arrived_at is null;
end $$;

-- Une mission d'agent sous la même forme qu'un ménage suivi en direct. La position et le tracé ne sortent que pendant le trajet.
create or replace function mission_live(m interventions) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff; s sites; t mission_trips; moving boolean; st time;
begin
  if m.id is null then return null; end if;
  select * into a from staff where id = m.staff_id;
  if m.site_id is not null then select * into s from sites where id = m.site_id; end if;
  select * into t from mission_trips where intervention_id = m.id;
  moving := m.stage::text = 'en_route' and m.arrived_at is null;
  st := coalesce(m.start_time, time '00:00');
  return jsonb_build_object('job', m.id, 'title', coalesce(s.name, m.title), 'status', 'acceptee', 'date', m.scheduled_date,
    'window_start', st, 'window_end', (st + (coalesce(m.duration_hours, 1) * interval '1 hour'))::time,
    'cleaner', case when a.id is not null then split_part(trim(a.full_name), ' ', 1) end,
    'dest', case when s.lat is not null then jsonb_build_array(s.lat, s.lng) end,
    'arrived_at', m.arrived_at, 'done_at', m.departed_at, 'duration_hours', m.duration_hours, 'moving', moving,
    'pos', case when moving and t.lat is not null then jsonb_build_array(t.lat, t.lng) end,
    'seen_at', case when moving then t.seen_at end,
    'eta_at', case when moving then t.eta_at end, 'eta_minutes', case when moving then t.eta_minutes end, 'eta_traffic', coalesce(t.eta_source, '') = 'trafic',
    'mode', case when coalesce(t.eta_source, '') = 'transports' then 'transports' else 'voiture' end, 'agent', true,
    'trail', case when moving then coalesce(t.trail, '[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function mission_live(interventions) from public, anon, authenticated;

-- Propriétaire ou conciergerie : ses ménages du jour, et les passages d'agents ProClean en route ou sur place chez lui.
create or replace function partner_live(p_secret text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret); today date := (now() at time zone 'Europe/Paris')::date;
begin
  return coalesce((select jsonb_agg(job_live(j) order by j.window_start) from cleaning_jobs j
    where j.client_id = cid and j.job_date = today and j.cleaner_id is not null and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), '[]'::jsonb)
  || coalesce((select jsonb_agg(mission_live(m) order by m.start_time nulls last) from interventions m
    where m.client_id = cid and m.scheduled_date = today and m.staff_id is not null and m.stage::text in ('en_route', 'arrivee', 'en_cours')), '[]'::jsonb);
end $$;

-- Direction : tous les ménages du jour, et les agents en route ou sur place.
create or replace function admin_live() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/Paris')::date;
begin
  if not is_owner() then raise exception 'ACCES_REFUSE: réservé à la direction'; end if;
  return coalesce((select jsonb_agg(job_live(j) || jsonb_build_object('client', (select name from clients where id = j.client_id), 'cleaner_full', (select full_name from cleaners where id = j.cleaner_id)) order by j.window_start)
    from cleaning_jobs j where j.job_date = today and j.cleaner_id is not null and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), '[]'::jsonb)
  || coalesce((select jsonb_agg(mission_live(m) || jsonb_build_object('client', (select name from clients where id = m.client_id), 'cleaner_full', (select full_name from staff where id = m.staff_id)) order by m.start_time nulls last)
    from interventions m where m.scheduled_date = today and m.staff_id is not null and m.stage::text in ('en_route', 'arrivee', 'en_cours')), '[]'::jsonb);
end $$;

-- Les trajets d'agents ne sont gardés que 7 jours, comme ceux des nettoyeurs.
create or replace function automation_purge_trail(p_secret text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  delete from cleaner_trail where at < now() - interval '7 days';
  delete from mission_trips where started_at < now() - interval '7 days';
end $$;

do $$
declare f text;
begin
  foreach f in array array['agent_trip_ping(text, uuid, double precision, double precision)', 'agent_trip_eta(text, uuid, int, text)', 'partner_live(text)', 'admin_live()', 'automation_purge_trail(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
