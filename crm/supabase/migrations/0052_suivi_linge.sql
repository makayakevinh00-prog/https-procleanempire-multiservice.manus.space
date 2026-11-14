-- 0052 — Suivi du linge : livreurs de linge (lien privé), tournées (livrer le linge propre avant le ménage, récupérer le linge sale après),
-- position du livreur, et information du nettoyeur (« linge propre sur place », « livreur à 2 km »).
create table if not exists linen_couriers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) >= 2),
  email text,
  phone text,
  active boolean not null default true,
  token_hash text unique,
  token_set_at timestamptz,
  last_lat double precision, last_lng double precision, last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists linen_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references cleaning_jobs(id) on delete cascade,
  kind text not null check (kind in ('livraison', 'collecte')),
  status text not null default 'a_faire' check (status in ('a_faire', 'en_route', 'fait')),
  courier_id uuid references linen_couriers(id) on delete set null,
  due_date date not null,
  started_at timestamptz, done_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (job_id, kind)
);
create index if not exists linen_runs_due_idx on linen_runs (due_date, status);
do $$ declare t text; begin
  foreach t in array array['linen_couriers', 'linen_runs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

-- Tournées d'un ménage : créées s'il existe au moins un livreur actif ; suivent la date ; disparaissent si le ménage est annulé.
create or replace function linen_runs_for_job(p_job uuid) returns void language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs;
begin
  select * into j from cleaning_jobs where id = p_job;
  if not found then return; end if;
  if j.status = 'annulee' then delete from linen_runs where job_id = j.id and status <> 'fait'; return; end if;
  if not exists (select 1 from linen_couriers where active) then return; end if;
  insert into linen_runs(job_id, kind, due_date) values (j.id, 'livraison', j.job_date), (j.id, 'collecte', j.job_date) on conflict (job_id, kind) do update set due_date = excluded.due_date where linen_runs.status <> 'fait';
end $$;
revoke all on function linen_runs_for_job(uuid) from public, anon, authenticated;

create or replace function cleaning_jobs_linen_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform linen_runs_for_job(new.id);
  return new;
end $$;
drop trigger if exists cleaning_jobs_linen on cleaning_jobs;
create trigger cleaning_jobs_linen after insert or update of job_date, status on cleaning_jobs for each row execute function cleaning_jobs_linen_trg();

-- Patron : créer les tournées des ménages à venir déjà publiés (au premier livreur ajouté).
create or replace function linen_backfill() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  for r in select id from cleaning_jobs where status in ('ouverte', 'acceptee') and job_date >= (now() at time zone 'Europe/Paris')::date loop perform linen_runs_for_job(r.id); n := n + 1; end loop;
  return n;
end $$;
revoke all on function linen_backfill() from public, anon;
grant execute on function linen_backfill() to authenticated;

-- ───────────── Livreur (lien privé) ─────────────
create or replace function courier_by_token(p_token text) returns linen_couriers language plpgsql security definer set search_path = public as $$
declare c linen_couriers;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  select * into c from linen_couriers where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') and active;
  if not found then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  return c;
end $$;
revoke all on function courier_by_token(text) from public, anon, authenticated;

-- Tournées à faire : celles de la veille à J+7 non faites, et celles faites aujourd'hui. Adresse et accès visibles (il doit entrer dans le logement).
create or replace function courier_runs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c linen_couriers; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := courier_by_token(p_token);
  return jsonb_build_object('name', c.full_name, 'today', today, 'runs', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'status', r.status, 'date', r.due_date, 'mine', coalesce(r.courier_id = c.id, false), 'taken', r.courier_id is not null and r.courier_id <> c.id,
        'title', j.title, 'address', j.address, 'postal_code', j.postal_code, 'city', j.city, 'access_notes', j.access_notes, 'window_start', j.window_start, 'window_end', j.window_end,
        'job_status', j.status, 'done_at', r.done_at) order by r.due_date, case r.kind when 'livraison' then 0 else 1 end, j.window_start)
      from linen_runs r join cleaning_jobs j on j.id = r.job_id
     where j.status <> 'annulee' and ((r.status <> 'fait' and r.due_date between today - 1 and today + 7) or (r.status = 'fait' and r.done_at >= now() - interval '18 hours' and r.courier_id = c.id))), '[]'::jsonb));
end $$;

-- Avancer une tournée : « Je pars » (elle devient la sienne), « Fait », ou « Je ne peux plus » (elle redevient libre).
-- Linge sale récupéré : le suivi des draps du ménage passe à « déposé (livreur) ».
create or replace function courier_run_update(p_token text, p_run uuid, p_status text) returns void language plpgsql security definer set search_path = public as $$
declare c linen_couriers; r linen_runs;
begin
  c := courier_by_token(p_token);
  select * into r from linen_runs where id = p_run for update;
  if not found or r.status = 'fait' then raise exception 'INDISPONIBLE: cette tournée est déjà faite ou n''existe plus'; end if;
  if r.courier_id is not null and r.courier_id <> c.id then raise exception 'INDISPONIBLE: un autre livreur s''en occupe'; end if;
  if p_status = 'en_route' then update linen_runs set status = 'en_route', courier_id = c.id, started_at = coalesce(started_at, now()) where id = r.id;
  elsif p_status = 'a_faire' then update linen_runs set status = 'a_faire', courier_id = null, started_at = null where id = r.id;
  elsif p_status = 'fait' then
    update linen_runs set status = 'fait', courier_id = c.id, done_at = now() where id = r.id;
    if r.kind = 'collecte' then
      insert into cleaning_linen(job_id, status, method) values (r.job_id, 'depose', 'livreur')
      on conflict (job_id) do update set status = 'depose', method = 'livreur', updated_at = now() where cleaning_linen.status = 'a_deposer';
    end if;
  else raise exception 'ARGUMENT: étape inconnue'; end if;
end $$;

create or replace function courier_ping(p_token text, p_lat double precision, p_lng double precision) returns void language plpgsql security definer set search_path = public as $$
declare c linen_couriers;
begin
  c := courier_by_token(p_token);
  if p_lat is null or p_lng is null or p_lat not between 41 and 52 or p_lng not between -6 and 10 then raise exception 'ARGUMENT: position hors de France métropolitaine'; end if;
  update linen_couriers set last_lat = p_lat, last_lng = p_lng, last_seen_at = now() where id = c.id;
end $$;

-- Ce que le nettoyeur sait du linge propre de SON ménage : sur place, en route (avec la position récente du livreur), ou pas encore parti.
create or replace function cleaning_job_linen(p_job uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r linen_runs; c linen_couriers; j cleaning_jobs; live boolean;
begin
  select * into r from linen_runs where job_id = p_job and kind = 'livraison';
  if not found then return null; end if;
  select * into j from cleaning_jobs where id = p_job;
  select * into c from linen_couriers where id = r.courier_id;
  live := r.status = 'en_route' and c.last_lat is not null and c.last_seen_at > now() - interval '15 minutes';
  return jsonb_build_object('status', case r.status when 'fait' then 'sur_place' when 'en_route' then 'en_route' else 'a_venir' end, 'done_at', r.done_at, 'courier', c.full_name, 'phone', case when r.status = 'en_route' then c.phone end,
    'lat', case when live then c.last_lat end, 'lng', case when live then c.last_lng end, 'seen_at', case when live then c.last_seen_at end,
    'km', case when live and j.lat is not null then round(geo_km(c.last_lat, c.last_lng, j.lat, j.lng)::numeric, 1) end);
end $$;
revoke all on function cleaning_job_linen(uuid) from public, anon, authenticated;

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

do $$ declare f text; begin
  foreach f in array array['courier_runs(text)', 'courier_run_update(text,uuid,text)', 'courier_ping(text,double precision,double precision)', 'cleaner_my_jobs(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
