-- 0053 — Stock de linge par logement, et espace des conciergeries partenaires (lien privé + clé d'API) :
-- elles relient leurs calendriers, ajoutent leurs logements, font la référence du logement, suivent leurs ménages et leur linge.
do $$ begin
  if to_regclass('public.concierge_listings') is not null then
    alter table concierge_listings add column if not exists linen_clean int not null default 0 check (linen_clean >= 0);
    alter table concierge_listings add column if not exists linen_dirty int not null default 0 check (linen_dirty >= 0);
    alter table concierge_listings add column if not exists linen_per_stay int not null default 1 check (linen_per_stay between 0 and 20);
  end if;
end $$;
alter table cleaning_jobs add column if not exists linen_counted boolean not null default false;

-- Un ménage terminé consomme le linge propre du logement et laisse du linge sale (compté une seule fois, même après une reprise).
create or replace function cleaning_jobs_stock_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'a_verifier' and not new.linen_counted and new.listing_id is not null and to_regclass('public.concierge_listings') is not null then
    update concierge_listings set linen_clean = greatest(0, linen_clean - linen_per_stay), linen_dirty = linen_dirty + linen_per_stay where id = new.listing_id;
    update cleaning_jobs set linen_counted = true where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists cleaning_jobs_stock on cleaning_jobs;
create trigger cleaning_jobs_stock after update of status on cleaning_jobs for each row execute function cleaning_jobs_stock_trg();

-- Livreur : en déposant il dit combien de parures (par défaut : ce qu'il faut pour un séjour) ; en récupérant il emporte tout le sale (ou le nombre indiqué).
drop function if exists courier_run_update(text, uuid, text);
create or replace function courier_run_update(p_token text, p_run uuid, p_status text, p_sets int default null) returns void language plpgsql security definer set search_path = public as $$
declare c linen_couriers; r linen_runs; lid uuid;
begin
  c := courier_by_token(p_token);
  select * into r from linen_runs where id = p_run for update;
  if not found or r.status = 'fait' then raise exception 'INDISPONIBLE: cette tournée est déjà faite ou n''existe plus'; end if;
  if r.courier_id is not null and r.courier_id <> c.id then raise exception 'INDISPONIBLE: un autre livreur s''en occupe'; end if;
  if p_sets is not null and (p_sets < 0 or p_sets > 50) then raise exception 'ARGUMENT: nombre de parures entre 0 et 50'; end if;
  if p_status = 'en_route' then update linen_runs set status = 'en_route', courier_id = c.id, started_at = coalesce(started_at, now()) where id = r.id;
  elsif p_status = 'a_faire' then update linen_runs set status = 'a_faire', courier_id = null, started_at = null where id = r.id;
  elsif p_status = 'fait' then
    update linen_runs set status = 'fait', courier_id = c.id, done_at = now() where id = r.id;
    select listing_id into lid from cleaning_jobs where id = r.job_id;
    if lid is not null and to_regclass('public.concierge_listings') is not null then
      if r.kind = 'livraison' then update concierge_listings set linen_clean = linen_clean + coalesce(p_sets, linen_per_stay) where id = lid;
      else update concierge_listings set linen_dirty = greatest(0, linen_dirty - coalesce(p_sets, linen_dirty)) where id = lid; end if;
    end if;
    if r.kind = 'collecte' then
      insert into cleaning_linen(job_id, status, method) values (r.job_id, 'depose', 'livreur')
      on conflict (job_id) do update set status = 'depose', method = 'livreur', updated_at = now() where cleaning_linen.status = 'a_deposer';
    end if;
  else raise exception 'ARGUMENT: étape inconnue'; end if;
end $$;

create or replace function courier_runs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c linen_couriers; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := courier_by_token(p_token);
  return jsonb_build_object('name', c.full_name, 'today', today, 'runs', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'status', r.status, 'date', r.due_date, 'mine', coalesce(r.courier_id = c.id, false), 'taken', r.courier_id is not null and r.courier_id <> c.id,
        'title', j.title, 'address', j.address, 'postal_code', j.postal_code, 'city', j.city, 'access_notes', j.access_notes, 'window_start', j.window_start, 'window_end', j.window_end,
        'job_status', j.status, 'done_at', r.done_at, 'stock', listing_linen(j.listing_id)) order by r.due_date, case r.kind when 'livraison' then 0 else 1 end, j.window_start)
      from linen_runs r join cleaning_jobs j on j.id = r.job_id
     where j.status <> 'annulee' and ((r.status <> 'fait' and r.due_date between today - 1 and today + 7) or (r.status = 'fait' and r.done_at >= now() - interval '18 hours' and r.courier_id = c.id))), '[]'::jsonb));
end $$;

-- Stock d'un logement (null si le ménage n'est pas rattaché à un logement).
create or replace function listing_linen(p_listing uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s jsonb;
begin
  if p_listing is null or to_regclass('public.concierge_listings') is null then return null; end if;
  execute 'select jsonb_build_object(''clean'', linen_clean, ''dirty'', linen_dirty, ''per_stay'', linen_per_stay) from concierge_listings where id = $1' into s using p_listing;
  return s;
end $$;
revoke all on function listing_linen(uuid) from public, anon, authenticated;

-- Ce que le nettoyeur sait du linge : la tournée du livreur (si elle existe) et le stock de linge propre du logement.
create or replace function cleaning_job_linen(p_job uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r linen_runs; c linen_couriers; j cleaning_jobs; live boolean; has_run boolean; s jsonb;
begin
  select * into j from cleaning_jobs where id = p_job;
  if not found then return null; end if;
  select * into r from linen_runs where job_id = p_job and kind = 'livraison';
  has_run := found;
  s := listing_linen(j.listing_id);
  if not has_run and s is null then return null; end if;
  if has_run then select * into c from linen_couriers where id = r.courier_id; end if;
  live := has_run and r.status = 'en_route' and c.last_lat is not null and c.last_seen_at > now() - interval '15 minutes';
  return jsonb_build_object('status', case when not has_run then null when r.status = 'fait' then 'sur_place' when r.status = 'en_route' then 'en_route' else 'a_venir' end, 'done_at', r.done_at, 'courier', c.full_name, 'phone', case when has_run and r.status = 'en_route' then c.phone end,
    'lat', case when live then c.last_lat end, 'lng', case when live then c.last_lng end, 'seen_at', case when live then c.last_seen_at end,
    'km', case when live and j.lat is not null then round(geo_km(c.last_lat, c.last_lng, j.lat, j.lng)::numeric, 1) end, 'stock', s);
end $$;
revoke all on function cleaning_job_linen(uuid) from public, anon, authenticated;

-- ───────────── Réservations : cœur commun (calendrier iCal ou clé d'API d'une conciergerie) ─────────────
create or replace function concierge_apply_core(p_listing uuid, p_events jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare l record; today date := (now() at time zone 'Europe/Paris')::date; uids text[]; s record; iid uuid; ex record; urgent boolean; has_ex boolean; ttl text; n_new int := 0; n_moved int := 0; n_gone int := 0;
begin
  select * into l from concierge_listings where id = p_listing;
  if not found then return jsonb_build_object('created', 0); end if;
  select coalesce(array_agg(e ->> 'uid'), '{}') into uids from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) e;
  insert into concierge_stays(listing_id, uid, check_in, check_out, summary, cancelled, updated_at)
  select p_listing, e ->> 'uid', (e ->> 'checkIn')::date, (e ->> 'checkOut')::date, nullif(e ->> 'summary', ''), false, now() from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) e
  on conflict (listing_id, uid) do update set check_in = excluded.check_in, check_out = excluded.check_out, summary = excluded.summary, cancelled = false, updated_at = now();
  update concierge_stays cs set cancelled = true, updated_at = now() where cs.listing_id = p_listing and not cs.cancelled and cs.check_out >= today and not (cs.uid = any(uids));
  update concierge_listings set last_sync_at = now(), last_sync_error = null where id = p_listing;
  if not l.auto_cleaning or exists (select 1 from concierge_automations where key = 'menages' and not enabled) then return jsonb_build_object('created', 0, 'moved', 0, 'cancelled', 0); end if;
  for s in select * from concierge_stays where listing_id = p_listing and check_out between today and today + 60 order by check_out loop
    select * into ex from interventions where source_key = 'conc:' || s.id;
    has_ex := found;
    if s.cancelled then
      if has_ex and ex.stage in ('brouillon', 'planifiee', 'affectee') then
        update interventions set stage = 'annulee' where id = ex.id; n_gone := n_gone + 1;
        update cleaning_jobs set status = 'annulee' where intervention_id = ex.id and status in ('ouverte', 'acceptee', 'a_reprendre');
      end if;
      continue;
    end if;
    urgent := exists (select 1 from concierge_stays o where o.listing_id = p_listing and o.id <> s.id and not o.cancelled and o.check_in = s.check_out);
    ttl := 'Ménage — ' || l.name || case when urgent then ' (arrivée le même jour)' else '' end;
    if not has_ex then
      insert into interventions(client_id, contract_id, site_id, title, scheduled_date, start_time, duration_hours, staff_id, quantity, unit_price_ht, vat_rate, billable, source_key, stage, activity)
      values (l.client_id, l.contract_id, l.site_id, ttl, s.check_out, l.checkout_time, l.cleaning_hours, l.staff_id, 1, case when coalesce(l.cleaning_price_ht, 0) > 0 then l.cleaning_price_ht end, 20, coalesce(l.cleaning_price_ht, 0) > 0,
              'conc:' || s.id, case when l.staff_id is not null then 'affectee' else 'planifiee' end, 'nettoyage_airbnb') returning id into iid;
      update concierge_stays set intervention_id = iid where id = s.id;
      n_new := n_new + 1;
    elsif ex.stage in ('brouillon', 'planifiee', 'affectee') and (ex.scheduled_date <> s.check_out or ex.title <> ttl or left(coalesce(ex.start_time::text, ''), 5) <> left(l.checkout_time::text, 5)) then
      update interventions set scheduled_date = s.check_out, start_time = l.checkout_time, title = ttl where id = ex.id;
      update cleaning_jobs set job_date = s.check_out, title = ttl where intervention_id = ex.id and status in ('ouverte', 'acceptee');
      n_moved := n_moved + 1;
    end if;
  end loop;
  return jsonb_build_object('created', n_new, 'moved', n_moved, 'cancelled', n_gone);
end $$;
revoke all on function concierge_apply_core(uuid, jsonb) from public, anon, authenticated;

create or replace function automation_concierge_apply(p_secret text, p_listing uuid, p_events jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return concierge_apply_core(p_listing, p_events);
end $$;

-- ───────────── Espace conciergerie ─────────────
create table if not exists partner_access (
  client_id uuid primary key references clients(id) on delete cascade,
  active boolean not null default true,
  token_hash text unique,
  token_set_at timestamptz,
  api_key_hash text unique,
  api_key_set_at timestamptz,
  created_at timestamptz not null default now()
);
alter table partner_access enable row level security;
revoke all on partner_access from anon;
drop policy if exists partner_access_owner on partner_access;
create policy partner_access_owner on partner_access for all to authenticated using (is_owner()) with check (is_owner());

-- Identifie la conciergerie par son lien privé, ou par sa clé d'API (« pk_… »). Renvoie le client auquel elle est rattachée.
create or replace function partner_client(p_secret text) returns uuid language plpgsql stable security definer set search_path = public as $$
declare cid uuid; h text;
begin
  if p_secret is null then raise exception 'ACCES_REFUSE: lien ou clé invalide'; end if;
  h := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');
  if p_secret ~ '^[0-9a-f]{64}$' then select client_id into cid from partner_access where token_hash = h and active;
  elsif p_secret ~ '^pk_[0-9a-f]{48}$' then select client_id into cid from partner_access where api_key_hash = h and active;
  end if;
  if cid is null then raise exception 'ACCES_REFUSE: lien ou clé invalide'; end if;
  return cid;
end $$;
revoke all on function partner_client(text) from public, anon, authenticated;

create or replace function partner_listing(p_secret text, p_listing uuid) returns uuid language plpgsql stable security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret);
begin
  if not exists (select 1 from concierge_listings where id = p_listing and client_id = cid) then raise exception 'INTROUVABLE: ce logement n''est pas le vôtre'; end if;
  return cid;
end $$;
revoke all on function partner_listing(text, uuid) from public, anon, authenticated;

-- Tableau de bord de la conciergerie : ses logements (calendrier, tarif, linge, référence) et ses ménages. Jamais ceux d'un autre client.
create or replace function partner_overview(p_secret text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret); today date := (now() at time zone 'Europe/Paris')::date;
begin
  return jsonb_build_object('name', (select name from clients where id = cid), 'has_api_key', (select api_key_hash is not null from partner_access where client_id = cid),
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'platform', l.platform, 'has_ical', l.ical_url is not null, 'last_sync_at', l.last_sync_at, 'last_sync_error', l.last_sync_error,
        'price', l.cleaning_price_ht, 'checkout_time', l.checkout_time, 'address', s.address, 'postal_code', s.postal_code, 'city', s.city, 'access_notes', s.access_notes,
        'linen_clean', l.linen_clean, 'linen_dirty', l.linen_dirty, 'linen_per_stay', l.linen_per_stay, 'has_guide', l.ref_guide is not null,
        'ref_photos', (select count(*) from listing_ref_photos p where p.listing_id = l.id),
        'next_checkout', (select min(check_out) from concierge_stays st where st.listing_id = l.id and not st.cancelled and st.check_out >= today)) order by l.name)
      from concierge_listings l left join sites s on s.id = l.site_id where l.client_id = cid), '[]'::jsonb),
    'jobs', coalesce((select jsonb_agg(x.o order by x.d) from (select j.job_date d, jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'status', j.status, 'city', j.city,
        'cleaner', (select split_part(c.full_name, ' ', 1) from cleaners c where c.id = j.cleaner_id), 'arrived', j.arrived_at is not null, 'ai_status', j.ai_status, 'summary', j.ai_report ->> 'summary', 'validated_by', j.validated_by) o
      from cleaning_jobs j where j.client_id = cid and j.status <> 'annulee' and j.job_date >= today - 14 order by j.job_date limit 60) x), '[]'::jsonb));
end $$;

-- Ajouter ou modifier un logement (le lien de calendrier a été vérifié par le serveur). Le tarif du ménage reste fixé par ProClean : sans tarif, rien n'est publié.
create or replace function partner_save_listing(p_secret text, p_id uuid, p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret); lid uuid := p_id; sid uuid; v_name text := left(trim(coalesce(p ->> 'name', '')), 120); v_postal text := coalesce(p ->> 'postal_code', '');
        v_platform text := coalesce(p ->> 'platform', 'autre'); v_time time := coalesce(nullif(p ->> 'checkout_time', '')::time, time '11:00');
begin
  if length(v_name) < 2 then raise exception 'ARGUMENT: donnez un nom au logement'; end if;
  if v_postal !~ '^\d{5}$' then raise exception 'ARGUMENT: code postal à 5 chiffres obligatoire'; end if;
  if length(trim(coalesce(p ->> 'address', ''))) < 4 then raise exception 'ARGUMENT: adresse du logement obligatoire'; end if;
  if v_platform not in ('airbnb', 'booking', 'abritel', 'autre') then v_platform := 'autre'; end if;
  if lid is not null then
    select site_id into sid from concierge_listings where id = lid and client_id = cid;
    if not found then raise exception 'INTROUVABLE: ce logement n''est pas le vôtre'; end if;
  elsif (select count(*) from concierge_listings where client_id = cid) >= 200 then raise exception 'ARGUMENT: 200 logements au plus'; end if;
  if sid is null then
    insert into sites(client_id, name, address, postal_code, city, access_notes) values (cid, v_name, left(trim(p ->> 'address'), 200), v_postal, left(nullif(trim(coalesce(p ->> 'city', '')), ''), 100), left(nullif(trim(coalesce(p ->> 'access_notes', '')), ''), 500)) returning id into sid;
  else
    update sites set name = v_name, address = left(trim(p ->> 'address'), 200), postal_code = v_postal, city = left(nullif(trim(coalesce(p ->> 'city', '')), ''), 100), access_notes = left(nullif(trim(coalesce(p ->> 'access_notes', '')), ''), 500) where id = sid and client_id = cid;
  end if;
  if lid is null then
    insert into concierge_listings(name, client_id, site_id, platform, ical_url, checkout_time) values (v_name, cid, sid, v_platform, nullif(p ->> 'ical_url', ''), v_time) returning id into lid;
  else
    update concierge_listings set name = v_name, site_id = sid, platform = v_platform, ical_url = case when coalesce((p ->> 'keep_ical')::boolean, false) then ical_url else nullif(p ->> 'ical_url', '') end, checkout_time = v_time, last_sync_error = null, updated_at = now() where id = lid;
  end if;
  return lid;
end $$;

create or replace function partner_set_linen(p_secret text, p_listing uuid, p_clean int) returns void language plpgsql security definer set search_path = public as $$
begin
  perform partner_listing(p_secret, p_listing);
  if p_clean is null or p_clean < 0 or p_clean > 200 then raise exception 'ARGUMENT: nombre de parures entre 0 et 200'; end if;
  update concierge_listings set linen_clean = p_clean where id = p_listing;
end $$;

-- Référence du logement faite par la conciergerie : photos (20 au plus), puis guide rédigé par l'IA (au plus une analyse toutes les 10 minutes par logement).
create or replace function partner_ref_add_photo(p_secret text, p_listing uuid, p_content_type text, p_data_b64 text) returns uuid language plpgsql security definer set search_path = public as $$
declare bytes bytea; pid uuid; n int;
begin
  perform partner_listing(p_secret, p_listing);
  if p_content_type not in ('image/jpeg', 'image/png', 'image/webp') then raise exception 'ARGUMENT: format non accepté (JPEG, PNG ou WebP)'; end if;
  select count(*) into n from listing_ref_photos where listing_id = p_listing;
  if n >= 20 then raise exception 'ARGUMENT: 20 photos de référence maximum par logement'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'ARGUMENT: photo vide ou trop lourde (1,5 Mo maximum)'; end if;
  insert into listing_ref_photos(listing_id, content_type, size_bytes, data) values (p_listing, p_content_type, octet_length(bytes), bytes) returning id into pid;
  return pid;
end $$;

create or replace function partner_ref_for_analysis(p_secret text, p_listing uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare l record;
begin
  perform partner_listing(p_secret, p_listing);
  select name, ref_at into l from concierge_listings where id = p_listing;
  if l.ref_at is not null and l.ref_at > now() - interval '10 minutes' then raise exception 'INDISPONIBLE: le guide vient d''être rédigé, réessayez dans quelques minutes'; end if;
  return jsonb_build_object('name', l.name, 'photos', coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', encode(x.data, 'base64'))) from (select content_type, data from listing_ref_photos where listing_id = p_listing order by created_at limit 10) x), '[]'::jsonb));
end $$;

create or replace function partner_set_guide(p_secret text, p_listing uuid, p_guide jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  perform partner_listing(p_secret, p_listing);
  if coalesce(jsonb_typeof(p_guide -> 'rooms'), '') <> 'array' then raise exception 'ARGUMENT: guide invalide'; end if;
  update concierge_listings set ref_guide = p_guide, ref_at = now() where id = p_listing;
end $$;

create or replace function partner_guide(p_secret text, p_listing uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform partner_listing(p_secret, p_listing);
  return (select ref_guide from concierge_listings where id = p_listing);
end $$;

-- Clé d'API : le serveur la génère et n'en garde que l'empreinte. Une nouvelle clé remplace l'ancienne.
create or replace function partner_set_api_key(p_secret text, p_key_hash text) returns void language plpgsql security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret);
begin
  if p_secret !~ '^[0-9a-f]{64}$' then raise exception 'ACCES_REFUSE: la clé se crée depuis l''espace conciergerie'; end if;
  if coalesce(p_key_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'ARGUMENT: empreinte invalide'; end if;
  update partner_access set api_key_hash = p_key_hash, api_key_set_at = now() where client_id = cid;
end $$;

-- API : envoyer (ou annuler) une réservation d'un logement. Le ménage du départ est créé, déplacé ou annulé comme avec un calendrier.
create or replace function partner_push_stay(p_secret text, p_listing uuid, p_uid text, p_check_in date, p_check_out date, p_cancelled boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare ev jsonb; today date := (now() at time zone 'Europe/Paris')::date;
begin
  perform partner_listing(p_secret, p_listing);
  if coalesce(p_uid, '') !~ '^[A-Za-z0-9._:@-]{1,120}$' then raise exception 'ARGUMENT: identifiant de réservation invalide (lettres, chiffres, . _ : @ -)'; end if;
  if p_check_in is null or p_check_out is null or p_check_out < p_check_in or p_check_out > today + 730 then raise exception 'ARGUMENT: dates invalides'; end if;
  if (select count(*) from concierge_stays where listing_id = p_listing) >= 2000 then raise exception 'ARGUMENT: trop de réservations enregistrées pour ce logement'; end if;
  -- État complet du logement après cette opération : les séjours à venir déjà connus, plus (ou moins) celui-ci.
  select coalesce(jsonb_agg(jsonb_build_object('uid', uid, 'checkIn', check_in, 'checkOut', check_out, 'summary', summary)), '[]'::jsonb) into ev
    from concierge_stays where listing_id = p_listing and not cancelled and check_out >= today and uid <> p_uid;
  if not coalesce(p_cancelled, false) then ev := ev || jsonb_build_array(jsonb_build_object('uid', p_uid, 'checkIn', p_check_in, 'checkOut', p_check_out, 'summary', 'API')); end if;
  return concierge_apply_core(p_listing, ev);
end $$;

do $$ declare f text; begin
  foreach f in array array['courier_runs(text)', 'courier_run_update(text,uuid,text,int)', 'automation_concierge_apply(text,uuid,jsonb)', 'partner_overview(text)', 'partner_save_listing(text,uuid,jsonb)', 'partner_set_linen(text,uuid,int)',
                           'partner_ref_add_photo(text,uuid,text,text)', 'partner_ref_for_analysis(text,uuid)', 'partner_set_guide(text,uuid,jsonb)', 'partner_guide(text,uuid)', 'partner_set_api_key(text,text)', 'partner_push_stay(text,uuid,text,date,date,boolean)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
