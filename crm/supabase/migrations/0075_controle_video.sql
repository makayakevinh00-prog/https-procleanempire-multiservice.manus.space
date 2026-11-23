-- Contrôle vidéo : mémoire de chaque logement (ce que l'IA y a déjà relevé), durée estimée du ménage, et propriétaire prévenu une seule fois au démarrage.
do $$ begin
  if to_regclass('public.concierge_listings') is not null then alter table concierge_listings add column if not exists visit_memory jsonb; end if;
end $$;
alter table cleaning_jobs add column if not exists est_minutes int;
alter table cleaning_jobs add column if not exists rework_minutes int;
alter table cleaning_jobs add column if not exists notified_start_at timestamptz;

-- Tout ce qu'il faut pour analyser un ménage et prévenir : logement, mémoire du lieu, nettoyeur, adresses du propriétaire ou de la conciergerie.
create or replace function automation_job_brief(p_secret text, p_job uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare j cleaning_jobs; mem jsonb; lname text;
begin
  perform automation_guard(p_secret);
  select * into j from cleaning_jobs where id = p_job;
  if not found then return null; end if;
  if j.listing_id is not null and to_regclass('public.concierge_listings') is not null then execute 'select visit_memory, name from concierge_listings where id = $1' into mem, lname using j.listing_id; end if;
  return jsonb_build_object('title', j.title, 'date', j.job_date, 'city', j.city, 'status', j.status, 'arrived_at', j.arrived_at, 'duration_hours', j.duration_hours,
    'est_minutes', j.est_minutes, 'rework_minutes', j.rework_minutes, 'listing', lname, 'has_listing', j.listing_id is not null, 'memory', mem,
    'before_report', j.before_report, 'ai_report', j.ai_report, 'started_notified', j.notified_start_at is not null,
    'cleaner', (select split_part(trim(full_name), ' ', 1) from cleaners where id = j.cleaner_id),
    'client', (select name from clients where id = j.client_id),
    'emails', coalesce((select jsonb_agg(distinct e) from (
        select lower(trim(email)) e from clients where id = j.client_id and coalesce(trim(email), '') <> ''
        union select lower(trim(email)) from client_emails where client_id = j.client_id and coalesce(trim(email), '') <> '') x), '[]'::jsonb));
end $$;

-- Après le relevé « avant » : durée estimée du ménage et mémoire du logement mise à jour.
create or replace function automation_set_before_extras(p_secret text, p_job uuid, p_minutes int, p_memory jsonb) returns void language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs;
begin
  perform automation_guard(p_secret);
  select * into j from cleaning_jobs where id = p_job;
  if not found then return; end if;
  update cleaning_jobs set est_minutes = case when p_minutes between 5 and 720 then p_minutes end where id = j.id;
  if p_memory is not null and j.listing_id is not null and to_regclass('public.concierge_listings') is not null then execute 'update concierge_listings set visit_memory = $1 where id = $2' using p_memory, j.listing_id; end if;
end $$;

-- Après le contrôle « après » : temps de reprise estimé (vide si rien à reprendre).
create or replace function automation_set_rework(p_secret text, p_job uuid, p_minutes int) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  update cleaning_jobs set rework_minutes = case when p_minutes between 1 and 240 then p_minutes end where id = p_job;
end $$;

-- « Ménage commencé » : envoyé une seule fois par ménage.
create or replace function automation_claim_start_notice(p_secret text, p_job uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  perform automation_guard(p_secret);
  update cleaning_jobs set notified_start_at = now() where id = p_job and notified_start_at is null returning true into ok;
  return coalesce(ok, false);
end $$;

-- Suivi en direct : la durée estimée par l'analyse (et le temps de reprise) s'ajoutent au chrono.
create or replace function job_live(j cleaning_jobs) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; moving boolean;
begin
  if j.id is null then return null; end if;
  select * into c from cleaners where id = j.cleaner_id;
  moving := j.status = 'acceptee' and j.job_date = today and j.arrived_at is null and j.trip_started_at is not null and c.last_seen_at > now() - interval '10 minutes';
  return jsonb_build_object('job', j.id, 'title', j.title, 'status', j.status, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end,
    'cleaner', case when c.id is not null then split_part(trim(c.full_name), ' ', 1) end,
    'dest', case when j.lat is not null then jsonb_build_array(j.lat, j.lng) end,
    'arrived_at', j.arrived_at, 'done_at', j.done_at, 'duration_hours', j.duration_hours, 'est_minutes', j.est_minutes,
    'rework_minutes', case when j.status = 'a_reprendre' then j.rework_minutes end, 'moving', moving,
    'pos', case when moving then jsonb_build_array(c.last_lat, c.last_lng) end,
    'seen_at', case when moving then c.last_seen_at end,
    'eta_at', case when moving then j.eta_at end, 'eta_minutes', case when moving then j.eta_minutes end, 'eta_traffic', coalesce(j.eta_source, '') = 'trafic',
    'trail', case when moving then coalesce((select jsonb_agg(jsonb_build_array(t.lat, t.lng) order by t.at) from (select lat, lng, at from cleaner_trail where job_id = j.id order by at desc limit 400) t), '[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function job_live(cleaning_jobs) from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['automation_job_brief(text, uuid)', 'automation_set_before_extras(text, uuid, int, jsonb)', 'automation_set_rework(text, uuid, int)', 'automation_claim_start_notice(text, uuid)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
