drop function if exists cleaner_training(text), cleaner_training_questions(text,text), cleaner_training_submit(text,text,jsonb), cleaner_linen_washed(text,uuid,boolean), training_pass_mark(), training_paris_min();
drop table if exists training_attempts, training_questions; drop sequence if exists certificate_seq;
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

create or replace function cleaner_my_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; need boolean; has_ref boolean := to_regclass('public.concierge_listings') is not null;
begin
  c := cleaner_by_token(p_token);
  select require_photos into need from marketplace_settings limit 1;
  return jsonb_build_object('require_photos', coalesce(need, true), 'jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end, 'hours', j.duration_hours,
        'city', j.city, 'postal_code', j.postal_code, 'address', j.address, 'access_notes', j.access_notes, 'amount', j.cleaner_amount, 'status', j.status,
        'cleaner_note', j.cleaner_note, 'review_note', j.review_note, 'departure', j.departure, 'arrived_at', j.arrived_at, 'validated_by', j.validated_by,
        'guide', case when has_ref and j.listing_id is not null then cleaning_job_guide(j.listing_id) end,
        'clean_linen', cleaning_job_linen(j.id),
        'photos_before', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant'),
        'photos_after', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres'),
        'before_report', j.before_report, 'ai_status', j.ai_status, 'ai_report', j.ai_report,
        'linen', (select jsonb_build_object('status', l.status, 'method', l.method, 'tracking', l.tracking) from cleaning_linen l where l.job_id = j.id)) order by j.job_date, j.window_start)
      from cleaning_jobs j where j.cleaner_id = c.id and (j.status in ('acceptee', 'a_verifier', 'a_reprendre') or (j.status = 'validee' and j.job_date >= today - 30))), '[]'::jsonb));
end $$;

create or replace function cleaning_job_amounts() returns trigger language plpgsql as $$
declare s marketplace_settings;
begin
  select * into s from marketplace_settings limit 1;
  if tg_op = 'INSERT' or new.price_ht is distinct from old.price_ht then
    new.cleaner_amount := round(new.price_ht * s.cleaner_pct / 100, 2);
    new.platform_amount := round(new.price_ht * s.platform_pct / 100, 2);
    new.logistics_amount := round(new.price_ht - new.cleaner_amount - new.platform_amount, 2);
  end if;
  return new;
end $$;
alter table cleaners drop column if exists certified_at, drop column if exists certificate_no, drop column if exists training_score;
alter table marketplace_settings drop column if exists linen_bonus;
alter table cleaning_jobs drop column if exists linen_washed, drop column if exists linen_bonus;
