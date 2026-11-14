-- 0051 — Référence d'un logement : photos (ou images tirées d'une vidéo) du logement propre, et guide de ménage rédigé par l'IA.
-- Le nettoyeur voit le guide ; le contrôle « après » compare ses photos à la référence. Tolère l'absence des tables de conciergerie.
do $$ begin
  if to_regclass('public.concierge_listings') is not null then
    alter table concierge_listings add column if not exists ref_guide jsonb;
    alter table concierge_listings add column if not exists ref_at timestamptz;
    create table if not exists listing_ref_photos (
      id uuid primary key default gen_random_uuid(),
      listing_id uuid not null references concierge_listings(id) on delete cascade,
      content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
      size_bytes int not null,
      data bytea not null,
      created_at timestamptz not null default now()
    );
    create index if not exists listing_ref_photos_listing_idx on listing_ref_photos (listing_id, created_at);
    alter table listing_ref_photos enable row level security;
    drop policy if exists listing_ref_photos_owner on listing_ref_photos;
    create policy listing_ref_photos_owner on listing_ref_photos for all to authenticated using (is_owner()) with check (is_owner());
    revoke all on listing_ref_photos from anon;
  end if;
end $$;

-- Ajout d'une photo de référence par le patron (20 au plus par logement, 1,5 Mo chacune).
create or replace function listing_ref_add_photo(p_listing uuid, p_content_type text, p_data_b64 text) returns uuid language plpgsql security definer set search_path = public as $$
declare bytes bytea; pid uuid; n int;
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  if not exists (select 1 from concierge_listings where id = p_listing) then raise exception 'ARGUMENT: logement introuvable'; end if;
  if p_content_type not in ('image/jpeg', 'image/png', 'image/webp') then raise exception 'ARGUMENT: format non accepté (JPEG, PNG ou WebP)'; end if;
  select count(*) into n from listing_ref_photos where listing_id = p_listing;
  if n >= 20 then raise exception 'ARGUMENT: 20 photos de référence maximum par logement'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'ARGUMENT: photo vide ou trop lourde (1,5 Mo maximum)'; end if;
  insert into listing_ref_photos(listing_id, content_type, size_bytes, data) values (p_listing, p_content_type, octet_length(bytes), bytes) returning id into pid;
  return pid;
end $$;
revoke all on function listing_ref_add_photo(uuid, text, text) from public, anon;
grant execute on function listing_ref_add_photo(uuid, text, text) to authenticated;

-- Photos de référence d'un logement, pour l'analyse faite par le patron (jusqu'à 10).
create or replace function listing_ref_photos_b64(p_listing uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', encode(x.data, 'base64'))) from (select content_type, data from listing_ref_photos where listing_id = p_listing order by created_at limit 10) x), '[]'::jsonb);
end $$;
revoke all on function listing_ref_photos_b64(uuid) from public, anon;
grant execute on function listing_ref_photos_b64(uuid) to authenticated;

-- Contexte d'un ménage pour l'IA : ajoute le guide du logement.
create or replace function automation_job_context(p_secret text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs; g jsonb;
begin
  perform automation_guard(p_secret);
  select * into j from cleaning_jobs where id = p_job;
  if not found then return null; end if;
  if j.listing_id is not null and to_regclass('public.concierge_listings') is not null then execute 'select ref_guide from concierge_listings where id = $1' into g using j.listing_id; end if;
  return jsonb_build_object('title', j.title, 'before_report', j.before_report, 'status', j.status, 'guide', g);
end $$;

-- Photos de référence du logement d'un ménage (4 au plus : elles s'ajoutent aux photos du nettoyeur dans l'analyse).
create or replace function automation_job_ref_photos(p_secret text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare lid uuid;
begin
  perform automation_guard(p_secret);
  select listing_id into lid from cleaning_jobs where id = p_job;
  if lid is null or to_regclass('public.listing_ref_photos') is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', encode(x.data, 'base64'))) from (select content_type, data from listing_ref_photos where listing_id = lid order by created_at limit 4) x), '[]'::jsonb);
end $$;

-- Mes ménages : ajoute le guide du logement.
create or replace function cleaner_my_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; need boolean; has_ref boolean := to_regclass('public.concierge_listings') is not null;
begin
  c := cleaner_by_token(p_token);
  select require_photos into need from marketplace_settings limit 1;
  return jsonb_build_object('require_photos', coalesce(need, true), 'jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end, 'hours', j.duration_hours,
        'city', j.city, 'postal_code', j.postal_code, 'address', j.address, 'access_notes', j.access_notes, 'amount', j.cleaner_amount, 'status', j.status,
        'cleaner_note', j.cleaner_note, 'review_note', j.review_note, 'departure', j.departure, 'arrived_at', j.arrived_at, 'validated_by', j.validated_by,
        'guide', case when has_ref and j.listing_id is not null then cleaning_job_guide(j.listing_id) end,
        'photos_before', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant'),
        'photos_after', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres'),
        'before_report', j.before_report, 'ai_status', j.ai_status, 'ai_report', j.ai_report,
        'linen', (select jsonb_build_object('status', l.status, 'method', l.method, 'tracking', l.tracking) from cleaning_linen l where l.job_id = j.id)) order by j.job_date, j.window_start)
      from cleaning_jobs j where j.cleaner_id = c.id and (j.status in ('acceptee', 'a_verifier', 'a_reprendre') or (j.status = 'validee' and j.job_date >= today - 30))), '[]'::jsonb));
end $$;

create or replace function cleaning_job_guide(p_listing uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g jsonb;
begin
  if to_regclass('public.concierge_listings') is null then return null; end if;
  execute 'select ref_guide from concierge_listings where id = $1' into g using p_listing;
  return g;
end $$;
revoke all on function cleaning_job_guide(uuid) from public, anon, authenticated;

do $$ declare f text; begin
  foreach f in array array['automation_job_context(text,uuid)', 'automation_job_ref_photos(text,uuid)', 'cleaner_my_jobs(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
