-- 0045 — Nettoyeurs, suite : photos avant / après et contrôle automatique, décision de départ, contrôle sur place par un agent, suivi des draps,
-- publication et paiements automatiques (créés seuls, jamais virés seuls).
alter table marketplace_settings add column if not exists auto_publish boolean not null default false;
alter table marketplace_settings add column if not exists auto_payout boolean not null default false;
alter table marketplace_settings add column if not exists require_photos boolean not null default true;

alter table cleaning_jobs add column if not exists departure text check (departure is null or departure in ('rester', 'partir'));
alter table cleaning_jobs add column if not exists control_intervention_id uuid references interventions(id) on delete set null;
alter table cleaning_jobs add column if not exists ai_status text check (ai_status is null or ai_status in ('ok', 'reprise', 'indisponible'));
alter table cleaning_jobs add column if not exists before_report jsonb;
alter table cleaning_jobs add column if not exists ai_report jsonb;

create table if not exists cleaning_job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references cleaning_jobs(id) on delete cascade,
  cleaner_id uuid references cleaners(id) on delete set null,
  kind text not null check (kind in ('avant', 'apres')),
  content_type text not null,
  size_bytes int not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists cleaning_job_photos_job_idx on cleaning_job_photos (job_id, kind);

create table if not exists cleaning_linen (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references cleaning_jobs(id) on delete cascade,
  status text not null default 'a_deposer' check (status in ('a_deposer', 'depose', 'lave', 'renvoye', 'recupere', 'remis')),
  method text check (method is null or method in ('poste', 'livreur')),
  tracking text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['cleaning_job_photos', 'cleaning_linen'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

-- ───────────── Nettoyeur (lien privé) ─────────────

-- Mes ménages : avec photos, rapport de l'IA, décision de la direction et état des draps.
create or replace function cleaner_my_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; need boolean;
begin
  c := cleaner_by_token(p_token);
  select require_photos into need from marketplace_settings limit 1;
  return jsonb_build_object('require_photos', coalesce(need, true), 'jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end, 'hours', j.duration_hours,
        'city', j.city, 'postal_code', j.postal_code, 'address', j.address, 'access_notes', j.access_notes, 'amount', j.cleaner_amount, 'status', j.status,
        'cleaner_note', j.cleaner_note, 'review_note', j.review_note, 'departure', j.departure,
        'photos_before', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant'),
        'photos_after', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres'),
        'before_report', j.before_report, 'ai_status', j.ai_status, 'ai_report', j.ai_report,
        'linen', (select jsonb_build_object('status', l.status, 'method', l.method, 'tracking', l.tracking) from cleaning_linen l where l.job_id = j.id)) order by j.job_date, j.window_start)
      from cleaning_jobs j where j.cleaner_id = c.id and (j.status in ('acceptee', 'a_verifier', 'a_reprendre') or (j.status = 'validee' and j.job_date >= today - 30))), '[]'::jsonb));
end $$;

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
  if n >= 16 then raise exception 'ARGUMENT: 16 photos maximum par ménage'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'ARGUMENT: photo vide ou trop lourde (1,5 Mo maximum)'; end if;
  insert into cleaning_job_photos(job_id, cleaner_id, kind, content_type, size_bytes, data) values (j.id, c.id, p_kind, p_content_type, octet_length(bytes), bytes) returning id into pid;
  return pid;
end $$;

-- Terminer : photos avant et après exigées (réglable), draps à suivre, puis la direction vérifie.
create or replace function cleaner_finish_job(p_token text, p_job uuid, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; today date := (now() at time zone 'Europe/Paris')::date; need boolean; nb int; na int;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id for update;
  if not found or j.status not in ('acceptee', 'a_reprendre') then raise exception 'INDISPONIBLE: ce ménage ne peut pas être terminé maintenant'; end if;
  if j.job_date > today then raise exception 'INDISPONIBLE: ce ménage n''a pas encore lieu'; end if;
  select coalesce(require_photos, true) into need from marketplace_settings limit 1;
  select count(*) filter (where kind = 'avant'), count(*) filter (where kind = 'apres') into nb, na from cleaning_job_photos where job_id = j.id;
  if coalesce(need, true) and (nb = 0 or na = 0) then raise exception 'INDISPONIBLE: ajoutez au moins une photo avant et une photo après le ménage'; end if;
  update cleaning_jobs set status = 'a_verifier', done_at = now(), departure = null, ai_status = null, cleaner_note = left(nullif(trim(coalesce(p_note, '')), ''), 1000) where id = j.id;
  insert into cleaning_linen(job_id) values (j.id) on conflict (job_id) do nothing;
  if j.intervention_id is not null then update interventions set stage = 'a_verifier' where id = j.intervention_id; end if;
end $$;

-- Draps : le nettoyeur dépose (poste ou livreur, avec le numéro de suivi), récupère au retour, puis les remet en place.
create or replace function cleaner_linen_update(p_token text, p_job uuid, p_status text, p_method text default null, p_tracking text default null) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; l cleaning_linen;
begin
  c := cleaner_by_token(p_token);
  if not exists (select 1 from cleaning_jobs where id = p_job and cleaner_id = c.id) then raise exception 'INDISPONIBLE: ce ménage n''est pas le vôtre'; end if;
  select * into l from cleaning_linen where job_id = p_job for update;
  if not found then raise exception 'INDISPONIBLE: les draps ne sont suivis qu''une fois le ménage terminé'; end if;
  if p_status = 'depose' and l.status = 'a_deposer' then
    if p_method is null or p_method not in ('poste', 'livreur') then raise exception 'ARGUMENT: choisissez poste ou livreur'; end if;
    update cleaning_linen set status = 'depose', method = p_method, tracking = left(nullif(trim(coalesce(p_tracking, '')), ''), 80), updated_at = now() where id = l.id;
  elsif p_status = 'recupere' and l.status = 'renvoye' then update cleaning_linen set status = 'recupere', updated_at = now() where id = l.id;
  elsif p_status = 'remis' and l.status = 'recupere' then update cleaning_linen set status = 'remis', updated_at = now() where id = l.id;
  else raise exception 'INDISPONIBLE: cette étape n''est pas possible maintenant'; end if;
end $$;

-- ───────────── Automatisations (secret du serveur : jamais appelables par un nettoyeur) ─────────────

create or replace function automation_job_photos(p_secret text, p_job uuid, p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', encode(x.data, 'base64'))) from (select content_type, data from cleaning_job_photos where job_id = p_job and kind = p_kind order by created_at limit 6) x), '[]'::jsonb);
end $$;

create or replace function automation_job_context(p_secret text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs;
begin
  perform automation_guard(p_secret);
  select * into j from cleaning_jobs where id = p_job;
  if not found then return null; end if;
  return jsonb_build_object('title', j.title, 'before_report', j.before_report, 'status', j.status);
end $$;

-- Résultat de l'analyse : « avant » = points à nettoyer ; « après » = verdict. Une reprise demandée par l'IA renvoie le ménage au nettoyeur, qui doit rester sur place.
create or replace function automation_set_job_analysis(p_secret text, p_job uuid, p_kind text, p_report jsonb, p_verdict text) returns void language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs;
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
  end if;
end $$;

-- Publication automatique : les ménages à venir sans agent, avec prix et code postal connus, sont proposés aux nettoyeurs.
create or replace function automation_publish_cleaning_jobs(p_secret text) returns int language plpgsql security definer set search_path = public as $$
declare s marketplace_settings; today date := (now() at time zone 'Europe/Paris')::date; n int := 0; r record;
begin
  perform automation_guard(p_secret);
  select * into s from marketplace_settings limit 1;
  if not coalesce(s.auto_publish, false) then return 0; end if;
  for r in
    select i.id as iid, i.client_id, i.title, i.scheduled_date, i.duration_hours, i.site_address, l.id as lid, l.cleaning_price_ht, l.cleaning_hours,
           coalesce(sx.postal_code, c.postal_code) as postal, coalesce(sx.city, c.city) as city, coalesce(sx.address, i.site_address, c.address) as addr, sx.access_notes
      from interventions i
      join concierge_stays st on st.id::text = substr(i.source_key, 6)
      join concierge_listings l on l.id = st.listing_id
      join clients c on c.id = i.client_id
      left join sites sx on sx.id = l.site_id
     where i.source_key like 'conc:%' and i.staff_id is null and i.assignee is null
       and i.scheduled_date between today and today + 30 and i.stage not in ('annulee', 'terminee', 'a_verifier', 'validee', 'facturable', 'facturee')
       and l.cleaning_price_ht is not null and coalesce(sx.postal_code, c.postal_code) is not null and not c.is_reserved
       and not exists (select 1 from cleaning_jobs j where j.intervention_id = i.id)
  loop
    insert into cleaning_jobs(intervention_id, listing_id, client_id, title, job_date, window_start, window_end, duration_hours, city, postal_code, address, access_notes, price_ht, priority_until)
    values (r.iid, r.lid, r.client_id, r.title, r.scheduled_date, s.window_start, s.window_end, coalesce(r.cleaning_hours, r.duration_hours), r.city, r.postal, r.addr, r.access_notes, r.cleaning_price_ht,
            case when s.priority_minutes > 0 and exists (select 1 from cleaner_favorites f where f.client_id = r.client_id) then now() + make_interval(mins => s.priority_minutes) end);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Paiements automatiques : les ménages validés non payés jusqu'à la fin de la période sont regroupés par nettoyeur. Le virement, lui, reste à valider par le patron.
create or replace function automation_create_payouts(p_secret text, p_start date, p_end date) returns jsonb language plpgsql security definer set search_path = public as $$
declare s marketplace_settings; r record; pid uuid; n int := 0; total numeric := 0;
begin
  perform automation_guard(p_secret);
  select * into s from marketplace_settings limit 1;
  if not coalesce(s.auto_payout, false) then return jsonb_build_object('payouts', 0, 'total', 0); end if;
  for r in select cleaner_id, sum(cleaner_amount) as amount, count(*) as jobs from cleaning_jobs where status = 'validee' and payout_id is null and cleaner_id is not null and validated_at < (p_end + 1)::timestamptz group by cleaner_id having sum(cleaner_amount) > 0
  loop
    insert into cleaning_payouts(cleaner_id, period_start, period_end, amount, jobs) values (r.cleaner_id, p_start, p_end, round(r.amount, 2), r.jobs) returning id into pid;
    update cleaning_jobs set payout_id = pid where status = 'validee' and payout_id is null and cleaner_id = r.cleaner_id and validated_at < (p_end + 1)::timestamptz;
    n := n + 1; total := total + r.amount;
  end loop;
  return jsonb_build_object('payouts', n, 'total', round(total, 2));
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_my_jobs(text)', 'cleaner_add_photo(text,uuid,text,text,text)', 'cleaner_finish_job(text,uuid,text)', 'cleaner_linen_update(text,uuid,text,text,text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
  foreach f in array array['automation_job_photos(text,uuid,text)', 'automation_job_context(text,uuid)', 'automation_set_job_analysis(text,uuid,text,jsonb,text)', 'automation_publish_cleaning_jobs(text)', 'automation_create_payouts(text,date,date)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);   -- protégées par automation_guard (secret serveur)
  end loop;
end $$;
