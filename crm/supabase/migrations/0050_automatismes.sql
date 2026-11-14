-- 0050 — Automatismes des ménages : validation automatique par l'IA (réglable), pointage d'arrivée, rappels (veille, 1 h avant),
-- remise en ligne si le nettoyeur n'a pas pointé, photos tirées d'une vidéo (plus de photos par ménage).
alter table marketplace_settings add column if not exists auto_validate boolean not null default true;
alter table cleaning_jobs add column if not exists arrived_at timestamptz;
alter table cleaning_jobs add column if not exists reminded_eve_at timestamptz;
alter table cleaning_jobs add column if not exists reminded_hour_at timestamptz;
alter table cleaning_jobs add column if not exists validated_by text check (validated_by is null or validated_by in ('ia', 'direction'));

-- Nettoyeur qui n'est pas venu : il ne revoit plus ce ménage.
create table if not exists cleaning_noshows (
  job_id uuid not null references cleaning_jobs(id) on delete cascade,
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (job_id, cleaner_id)
);
alter table cleaning_noshows enable row level security;
revoke all on cleaning_noshows from anon, authenticated;
drop policy if exists cleaning_noshows_owner on cleaning_noshows;
create policy cleaning_noshows_owner on cleaning_noshows for select to authenticated using (is_owner());
grant select on cleaning_noshows to authenticated;

create or replace function dispatch_eligible(c cleaners, j cleaning_jobs) returns boolean language sql stable as $$
  select c.status = 'actif' and cleaner_covers(c, j)
     and not exists (select 1 from cleaning_noshows n where n.job_id = j.id and n.cleaner_id = c.id)
     and not exists (
    select 1 from cleaning_jobs o where o.cleaner_id = c.id and o.id <> j.id and o.job_date = j.job_date and o.status in ('acceptee', 'a_verifier', 'a_reprendre') and o.window_start < j.window_end and j.window_start < o.window_end)
$$;
revoke all on function dispatch_eligible(cleaners, cleaning_jobs) from public, anon, authenticated;

-- « Je suis sur place » : pointage d'arrivée, le jour du ménage.
create or replace function cleaner_arrive(p_token text, p_job uuid) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id for update;
  if not found or j.status not in ('acceptee', 'a_reprendre') then raise exception 'INDISPONIBLE: ce ménage n''est plus à faire'; end if;
  if j.job_date <> (now() at time zone 'Europe/Paris')::date then raise exception 'INDISPONIBLE: le pointage se fait le jour du ménage'; end if;
  update cleaning_jobs set arrived_at = coalesce(arrived_at, now()) where id = j.id;
end $$;

-- Photos : jusqu'à 40 par ménage (les images tirées d'une vidéo comptent) ; la première photo « avant » vaut pointage d'arrivée.
create or replace function cleaner_add_photo(p_token text, p_job uuid, p_kind text, p_content_type text, p_data_b64 text) returns uuid language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; bytes bytea; pid uuid; n int; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id;
  if not found or j.status not in ('acceptee', 'a_reprendre') then raise exception 'INDISPONIBLE: vous ne pouvez plus ajouter de photo à ce ménage'; end if;
  if j.job_date > today then raise exception 'INDISPONIBLE: les photos se prennent le jour du ménage'; end if;
  if p_kind not in ('avant', 'apres') then raise exception 'ARGUMENT: type de photo inconnu'; end if;
  if p_content_type not in ('image/jpeg', 'image/png', 'image/webp') then raise exception 'ARGUMENT: format non accepté (JPEG, PNG ou WebP)'; end if;
  select count(*) into n from cleaning_job_photos where job_id = j.id;
  if n >= 40 then raise exception 'ARGUMENT: 40 photos maximum par ménage'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'ARGUMENT: photo vide ou trop lourde (1,5 Mo maximum)'; end if;
  insert into cleaning_job_photos(job_id, cleaner_id, kind, content_type, size_bytes, data) values (j.id, c.id, p_kind, p_content_type, octet_length(bytes), bytes) returning id into pid;
  if j.arrived_at is null and j.job_date = today then update cleaning_jobs set arrived_at = now() where id = j.id; end if;
  return pid;
end $$;

create or replace function cleaner_my_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; need boolean;
begin
  c := cleaner_by_token(p_token);
  select require_photos into need from marketplace_settings limit 1;
  return jsonb_build_object('require_photos', coalesce(need, true), 'jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end, 'hours', j.duration_hours,
        'city', j.city, 'postal_code', j.postal_code, 'address', j.address, 'access_notes', j.access_notes, 'amount', j.cleaner_amount, 'status', j.status,
        'cleaner_note', j.cleaner_note, 'review_note', j.review_note, 'departure', j.departure, 'arrived_at', j.arrived_at, 'validated_by', j.validated_by,
        'photos_before', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant'),
        'photos_after', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres'),
        'before_report', j.before_report, 'ai_status', j.ai_status, 'ai_report', j.ai_report,
        'linen', (select jsonb_build_object('status', l.status, 'method', l.method, 'tracking', l.tracking) from cleaning_linen l where l.job_id = j.id)) order by j.job_date, j.window_start)
      from cleaning_jobs j where j.cleaner_id = c.id and (j.status in ('acceptee', 'a_verifier', 'a_reprendre') or (j.status = 'validee' and j.job_date >= today - 30))), '[]'::jsonb));
end $$;

-- ───────────── Serveur seulement (secret) ─────────────

-- Les 10 photos les plus récentes d'un type (les reprises remplacent les anciennes dans l'analyse).
create or replace function automation_job_photos(p_secret text, p_job uuid, p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', encode(x.data, 'base64'))) from (select content_type, data from cleaning_job_photos where job_id = p_job and kind = p_kind order by created_at desc limit 10) x), '[]'::jsonb);
end $$;

-- Verdict de l'IA. « reprise » : retour au nettoyeur, qui reste sur place. « ok » : validation automatique si le réglage est activé et que l'IA n'est pas peu sûre ; sinon la direction valide.
create or replace function automation_set_job_analysis(p_secret text, p_job uuid, p_kind text, p_report jsonb, p_verdict text) returns void language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs; auto boolean;
begin
  perform automation_guard(p_secret);
  select * into j from cleaning_jobs where id = p_job for update;
  if not found then return; end if;
  if p_kind = 'avant' then update cleaning_jobs set before_report = p_report where id = j.id; return; end if;
  if p_verdict not in ('ok', 'reprise', 'indisponible') then raise exception 'ARGUMENT: verdict inconnu'; end if;
  update cleaning_jobs set ai_report = p_report, ai_status = p_verdict where id = j.id;
  if p_verdict = 'reprise' and j.status = 'a_verifier' then
    update cleaning_jobs set status = 'a_reprendre', departure = 'rester', review_note = left('Contrôle automatique : ' || coalesce(p_report ->> 'summary', 'des points restent à nettoyer.'), 600) where id = j.id;
    if j.intervention_id is not null then update interventions set stage = 'en_cours' where id = j.intervention_id; end if;
  elsif p_verdict = 'ok' and j.status = 'a_verifier' then
    select coalesce(auto_validate, false) into auto from marketplace_settings limit 1;
    if coalesce(auto, false) and coalesce(p_report ->> 'confidence', 'moyenne') <> 'faible' then
      update cleaning_jobs set status = 'validee', validated_at = now(), validated_by = 'ia', departure = 'partir' where id = j.id;
      if j.intervention_id is not null then update interventions set stage = 'validee' where id = j.intervention_id; end if;
    end if;
  end if;
end $$;

-- Rappels à envoyer (marqués envoyés tout de suite : jamais deux fois). Veille : à partir de 17 h pour les ménages du lendemain. Jour J : dans l'heure qui précède le créneau.
create or replace function automation_cleaning_reminders(p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb := '[]'::jsonb; j cleaning_jobs; c cleaners; nowp timestamp := now() at time zone 'Europe/Paris'; k text;
begin
  perform automation_guard(p_secret);
  for j in select * from cleaning_jobs where status = 'acceptee' and cleaner_id is not null and (
        (job_date = nowp::date + 1 and reminded_eve_at is null and nowp::time >= time '17:00')
     or (job_date = nowp::date and reminded_hour_at is null and arrived_at is null and nowp >= (job_date + window_start) - interval '60 minutes' and nowp < (job_date + window_end)))
      order by job_date limit 50 for update skip locked loop
    k := case when j.job_date = nowp::date then 'heure' else 'veille' end;
    if k = 'heure' then update cleaning_jobs set reminded_hour_at = now() where id = j.id; else update cleaning_jobs set reminded_eve_at = now() where id = j.id; end if;
    select * into c from cleaners where id = j.cleaner_id;
    out := out || jsonb_build_array(jsonb_build_object('kind', k, 'title', j.title, 'date', j.job_date, 'city', j.city, 'window_start', j.window_start, 'window_end', j.window_end,
      'name', c.full_name, 'email', c.email, 'push', coalesce((select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)) from cleaner_push p where p.cleaner_id = c.id), '[]'::jsonb)));
  end loop;
  return out;
end $$;

-- Pas pointé à l'heure : le ménage est remis en ligne pour les autres. « À l'heure » = au plus tard 15 min après la dernière heure de départ possible
-- (fin du créneau moins la durée du ménage), et jamais avant 30 min après le début du créneau.
create or replace function automation_release_noshows(p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb := '[]'::jsonb; j cleaning_jobs; c cleaners; nowp timestamp := now() at time zone 'Europe/Paris';
begin
  perform automation_guard(p_secret);
  for j in select * from cleaning_jobs where status = 'acceptee' and cleaner_id is not null and job_date = nowp::date and arrived_at is null
        and not exists (select 1 from cleaning_job_photos p where p.job_id = cleaning_jobs.id)
        and nowp < (job_date + window_end)
        and nowp > greatest((job_date + window_start) + interval '30 minutes', (job_date + window_end) - make_interval(mins => (coalesce(duration_hours, 2) * 60)::int) + interval '15 minutes')
      for update skip locked loop
    select * into c from cleaners where id = j.cleaner_id;
    insert into cleaning_noshows(job_id, cleaner_id) values (j.id, j.cleaner_id) on conflict do nothing;
    delete from cleaning_offers where job_id = j.id;
    update cleaning_jobs set status = 'ouverte', cleaner_id = null, accepted_at = null, created_at = now(), reminded_hour_at = null where id = j.id;
    if j.intervention_id is not null then update interventions set assignee = null where id = j.intervention_id; end if;
    out := out || jsonb_build_array(jsonb_build_object('title', j.title, 'date', j.job_date, 'city', j.city, 'name', c.full_name, 'email', c.email));
  end loop;
  return out;
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_arrive(text,uuid)', 'cleaner_add_photo(text,uuid,text,text,text)', 'cleaner_my_jobs(text)', 'automation_job_photos(text,uuid,text)', 'automation_set_job_analysis(text,uuid,text,jsonb,text)',
                           'automation_cleaning_reminders(text)', 'automation_release_noshows(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
