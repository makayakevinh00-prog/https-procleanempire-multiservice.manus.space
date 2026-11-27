-- Messagerie par ménage, avis des conciergeries, signalement de problème par le nettoyeur.
create table if not exists public.cleaning_messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.cleaning_jobs(id) on delete cascade,
  role text not null check (role in ('nettoyeur','conciergerie','admin')),
  author text,
  body text not null check (length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists cleaning_messages_job_idx on public.cleaning_messages (job_id, created_at);
alter table public.cleaning_messages enable row level security;
drop policy if exists cleaning_messages_owner on public.cleaning_messages;
create policy cleaning_messages_owner on public.cleaning_messages for all using (is_owner()) with check (is_owner());

create table if not exists public.cleaning_reviews (
  job_id uuid primary key references public.cleaning_jobs(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.cleaning_reviews enable row level security;
drop policy if exists cleaning_reviews_owner on public.cleaning_reviews;
create policy cleaning_reviews_owner on public.cleaning_reviews for all using (is_owner()) with check (is_owner());

-- Fil d'un ménage, côté nettoyeur.
create or replace function public.cleaner_job_thread(p_token text, p_job uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_by_token(p_token);
begin
  if not exists (select 1 from cleaning_jobs where id = p_job and cleaner_id = c.id) then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  return jsonb_build_object(
    'job', (select jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'status', j.status) from cleaning_jobs j where j.id = p_job),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('role', m.role, 'author', m.author, 'body', m.body, 'at', m.created_at) order by m.created_at) from cleaning_messages m where m.job_id = p_job), '[]'::jsonb));
end $$;

create or replace function public.cleaner_post_message(p_token text, p_job uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_by_token(p_token); j cleaning_jobs;
begin
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id;
  if not found then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  if p_body is null or length(btrim(p_body)) = 0 then raise exception 'INVALIDE: écrivez un message'; end if;
  insert into cleaning_messages (job_id, role, author, body) values (p_job, 'nettoyeur', split_part(c.full_name, ' ', 1), left(btrim(p_body), 1000));
  return jsonb_build_object('title', j.title, 'client_id', j.client_id, 'name', c.full_name);
end $$;

-- Signalement d'un problème (dégât, accès impossible, logement très sale…) : anomalie ouverte + message dans le fil.
create or replace function public.cleaner_report_problem(p_token text, p_job uuid, p_kind text, p_text text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_by_token(p_token); j cleaning_jobs; sid uuid; sev text; label text;
begin
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id;
  if not found then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  if p_text is null or length(btrim(p_text)) < 3 then raise exception 'INVALIDE: décrivez le problème'; end if;
  label := case p_kind when 'degat' then 'Dégât constaté' when 'acces' then 'Accès impossible' when 'sale' then 'Logement très sale' when 'manque' then 'Matériel ou linge manquant' else 'Autre problème' end;
  sev := case when p_kind in ('degat','acces') then 'haute' else 'normale' end;
  if j.intervention_id is not null then select site_id into sid from interventions where id = j.intervention_id; end if;
  if j.client_id is not null then
    insert into mission_issues (kind, intervention_id, site_id, client_id, severity, description, status, reported_by)
    values ('anomalie', j.intervention_id, sid, j.client_id, sev, label || ' — ' || left(btrim(p_text), 800), 'ouverte', 'nettoyeur: ' || c.full_name);
  end if;
  insert into cleaning_messages (job_id, role, author, body) values (p_job, 'nettoyeur', split_part(c.full_name, ' ', 1), left('⚠️ ' || label || ' : ' || btrim(p_text), 1000));
  return jsonb_build_object('title', j.title, 'client_id', j.client_id, 'name', c.full_name, 'label', label, 'severity', sev);
end $$;

-- Côté conciergerie.
create or replace function public.partner_job_thread(p_secret text, p_job uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret);
begin
  if not exists (select 1 from cleaning_jobs where id = p_job and client_id = cid) then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  return jsonb_build_object(
    'job', (select jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'status', j.status, 'cleaner', (select split_part(full_name, ' ', 1) from cleaners where id = j.cleaner_id)) from cleaning_jobs j where j.id = p_job),
    'review', (select jsonb_build_object('rating', r.rating, 'comment', r.comment) from cleaning_reviews r where r.job_id = p_job),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('role', m.role, 'author', m.author, 'body', m.body, 'at', m.created_at) order by m.created_at) from cleaning_messages m where m.job_id = p_job), '[]'::jsonb));
end $$;

create or replace function public.partner_post_message(p_secret text, p_job uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret); j cleaning_jobs; cname text;
begin
  select * into j from cleaning_jobs where id = p_job and client_id = cid;
  if not found then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  if p_body is null or length(btrim(p_body)) = 0 then raise exception 'INVALIDE: écrivez un message'; end if;
  select name into cname from clients where id = cid;
  insert into cleaning_messages (job_id, role, author, body) values (p_job, 'conciergerie', cname, left(btrim(p_body), 1000));
  return jsonb_build_object('title', j.title, 'cleaner_id', j.cleaner_id, 'cleaner_email', (select email from cleaners where id = j.cleaner_id), 'cleaner_name', (select full_name from cleaners where id = j.cleaner_id), 'client', cname);
end $$;

create or replace function public.partner_rate_job(p_secret text, p_job uuid, p_rating int, p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret); j cleaning_jobs;
begin
  select * into j from cleaning_jobs where id = p_job and client_id = cid;
  if not found then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  if j.cleaner_id is null or j.status not in ('a_verifier','validee','a_reprendre') then raise exception 'INDISPONIBLE: le ménage n''est pas encore terminé'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'INVALIDE: note de 1 à 5'; end if;
  insert into cleaning_reviews (job_id, rating, comment) values (p_job, p_rating, nullif(left(btrim(coalesce(p_comment, '')), 500), ''))
  on conflict (job_id) do update set rating = excluded.rating, comment = excluded.comment, created_at = now();
end $$;

-- La note du nettoyeur compte désormais aussi les avis des conciergeries.
create or replace function public.cleaner_reliability(c cleaners) returns jsonb
language sql stable as $$
  with r as (
    select b.rating from cleaning_bookings b join cleaning_jobs j on j.id = b.job_id where j.cleaner_id = c.id and b.rating is not null
    union all
    select v.rating from cleaning_reviews v join cleaning_jobs j on j.id = v.job_id where j.cleaner_id = c.id
  ), n as (
    select (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee' and j.review_note is null)::int as clean,
           (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.review_note is not null)::int as redo,
           (select count(*) from cleaning_noshows s where s.cleaner_id = c.id)::int as missed,
           (select round(avg(rating), 1) from r) as stars,
           (select count(*) from r)::int as ratings)
  select jsonb_build_object('clean', clean, 'redo', redo, 'missed', missed, 'stars', stars, 'ratings', ratings,
                            'score', case when clean + redo + missed >= 3 then round(100.0 * clean / (clean + redo + missed))::int end) from n
$$;
