-- 0078 — L'IA connaît le lieu avant le film : pièces déclarées (par le propriétaire, la conciergerie ou la direction) et guide de référence du logement.
create or replace function automation_job_brief(p_secret text, p_job uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare j cleaning_jobs; mem jsonb; lname text; guide jsonb; lrooms text[];
begin
  perform automation_guard(p_secret);
  select * into j from cleaning_jobs where id = p_job;
  if not found then return null; end if;
  if j.listing_id is not null and to_regclass('public.concierge_listings') is not null then execute 'select visit_memory, name, ref_guide, rooms from concierge_listings where id = $1' into mem, lname, guide, lrooms using j.listing_id; end if;
  return jsonb_build_object('title', j.title, 'date', j.job_date, 'city', j.city, 'status', j.status, 'arrived_at', j.arrived_at, 'duration_hours', j.duration_hours,
    'est_minutes', j.est_minutes, 'rework_minutes', j.rework_minutes, 'listing', lname, 'has_listing', j.listing_id is not null, 'memory', mem,
    -- Pièces réellement déclarées pour ce logement (jamais la liste par défaut) : la liste saisie, sinon les pièces du guide de référence.
    'rooms', case when coalesce(array_length(lrooms, 1), 0) > 0 then to_jsonb(lrooms)
                  else coalesce((select jsonb_agg(r ->> 'room') from jsonb_array_elements(case when jsonb_typeof(guide -> 'rooms') = 'array' then guide -> 'rooms' else '[]'::jsonb end) r where coalesce(r ->> 'room', '') <> ''), '[]'::jsonb) end,
    'guide', guide,
    'before_report', j.before_report, 'ai_report', j.ai_report, 'started_notified', j.notified_start_at is not null,
    'cleaner', (select split_part(trim(full_name), ' ', 1) from cleaners where id = j.cleaner_id),
    'client', (select name from clients where id = j.client_id),
    'emails', coalesce((select jsonb_agg(distinct e) from (
        select lower(trim(email)) e from clients where id = j.client_id and coalesce(trim(email), '') <> ''
        union select lower(trim(email)) from client_emails where client_id = j.client_id and coalesce(trim(email), '') <> '') x), '[]'::jsonb));
end $$;
