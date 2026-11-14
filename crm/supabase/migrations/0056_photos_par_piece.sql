-- 0056 — Photos pièce par pièce. Les pièces viennent du logement (liste saisie, sinon pièces du guide), sinon d'une liste standard réglable.
-- Chaque photo porte sa pièce ; pour terminer, chaque pièce a sa photo avant et après — ou le nettoyeur explique pourquoi.
alter table marketplace_settings add column if not exists default_rooms text[] not null default array['Cuisine', 'Salon / séjour', 'Chambre', 'Salle de bain / douche', 'WC'];
alter table cleaning_jobs add column if not exists rooms jsonb not null default '[]'::jsonb;
alter table cleaning_job_photos add column if not exists room text;
do $$ begin
  if to_regclass('public.concierge_listings') is not null then alter table concierge_listings add column if not exists rooms text[]; end if;
end $$;

-- Pièces à photographier pour un logement : sa liste, sinon les pièces de son guide, sinon la liste standard.
create or replace function cleaning_job_rooms(p_listing uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r text[]; g jsonb; t jsonb;
begin
  if p_listing is not null and to_regclass('public.concierge_listings') is not null then
    execute 'select rooms, ref_guide from concierge_listings where id = $1' into r, g using p_listing;
  end if;
  if r is not null and array_length(r, 1) > 0 then select jsonb_agg(left(trim(x), 60)) into t from unnest(r) x where trim(x) <> ''; end if;
  if (t is null or jsonb_array_length(t) = 0) and g is not null and jsonb_typeof(g -> 'rooms') = 'array' then
    select jsonb_agg(left(e ->> 'room', 60)) into t from jsonb_array_elements(g -> 'rooms') e where coalesce(e ->> 'room', '') <> '';
  end if;
  if t is null or jsonb_array_length(t) = 0 then select jsonb_agg(left(trim(x), 60)) into t from (select unnest(default_rooms) x from marketplace_settings limit 20) d where trim(x) <> ''; end if;
  return coalesce((select jsonb_agg(u.v order by u.n) from (select distinct on (v) v, n from jsonb_array_elements_text(coalesce(t, '[]'::jsonb)) with ordinality e(v, n) order by v, n) u), '[]'::jsonb);
end $$;
revoke all on function cleaning_job_rooms(uuid) from public, anon, authenticated;

-- Pièces sans photo, lisible : « Cuisine (après), WC (avant et après) ». Null si tout y est.
create or replace function cleaning_missing_rooms(p_job uuid) returns text language sql stable security definer set search_path = public as $$
  select string_agg(m.room || ' (' || m.what || ')', ', ' order by m.n)
    from (select r.room, r.n, case when not a.has and not b.has then 'avant et après' when not a.has then 'avant' else 'après' end as what, a.has ha, b.has hb
            from cleaning_jobs j, jsonb_array_elements_text(j.rooms) with ordinality r(room, n),
                 lateral (select exists (select 1 from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant' and p.room = r.room) has) a,
                 lateral (select exists (select 1 from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres' and p.room = r.room) has) b
           where j.id = p_job) m
   where not m.ha or not m.hb
$$;
revoke all on function cleaning_missing_rooms(uuid) from public, anon, authenticated;

create or replace function cleaning_jobs_tasks_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare miss text;
begin
  -- Tâches et pièces sont fixées quand un nettoyeur accepte.
  if new.status = 'acceptee' and (tg_op = 'INSERT' or old.status is distinct from 'acceptee') then
    if jsonb_array_length(new.checklist) = 0 then new.checklist := cleaning_job_tasks(new.listing_id); end if;
    if jsonb_array_length(new.rooms) = 0 then new.rooms := cleaning_job_rooms(new.listing_id); end if;
  end if;
  -- Terminer : tout coché et chaque pièce photographiée, ou un mot d'explication.
  if tg_op = 'UPDATE' and new.status = 'a_verifier' and old.status in ('acceptee', 'a_reprendre') and coalesce(trim(new.cleaner_note), '') = '' then
    if exists (select 1 from jsonb_array_elements(new.checklist) e where not coalesce((e ->> 'done')::boolean, false)) then
      raise exception 'INDISPONIBLE: il reste des tâches non cochées : cochez-les, ou expliquez pourquoi dans le mot pour la direction';
    end if;
    miss := cleaning_missing_rooms(new.id);
    if miss is not null and coalesce((select require_photos from marketplace_settings limit 1), true) then
      raise exception 'INDISPONIBLE: il manque des photos : %. Prenez-les, ou expliquez pourquoi dans le mot pour la direction', miss;
    end if;
  end if;
  return new;
end $$;

-- Photo d'une pièce (la pièce doit être une de celles du ménage ; sans pièce = photo générale, par exemple tirée d'une vidéo).
drop function if exists cleaner_add_photo(text, uuid, text, text, text);
create or replace function cleaner_add_photo(p_token text, p_job uuid, p_kind text, p_content_type text, p_data_b64 text, p_room text default null) returns uuid language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; bytes bytea; pid uuid; n int; today date := (now() at time zone 'Europe/Paris')::date; v_room text := nullif(trim(coalesce(p_room, '')), '');
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id;
  if not found or j.status not in ('acceptee', 'a_reprendre') then raise exception 'INDISPONIBLE: vous ne pouvez plus ajouter de photo à ce ménage'; end if;
  if j.job_date > today then raise exception 'INDISPONIBLE: les photos se prennent le jour du ménage'; end if;
  if p_kind not in ('avant', 'apres') then raise exception 'ARGUMENT: type de photo inconnu'; end if;
  if p_content_type not in ('image/jpeg', 'image/png', 'image/webp') then raise exception 'ARGUMENT: format non accepté (JPEG, PNG ou WebP)'; end if;
  if v_room is not null and not exists (select 1 from jsonb_array_elements_text(j.rooms) r where r = v_room) then raise exception 'ARGUMENT: pièce inconnue pour ce ménage'; end if;
  select count(*) into n from cleaning_job_photos where job_id = j.id;
  if n >= 60 then raise exception 'ARGUMENT: 60 photos maximum par ménage'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'ARGUMENT: photo vide ou trop lourde (1,5 Mo maximum)'; end if;
  insert into cleaning_job_photos(job_id, cleaner_id, kind, content_type, size_bytes, data, room) values (j.id, c.id, p_kind, p_content_type, octet_length(bytes), bytes, v_room) returning id into pid;
  if j.arrived_at is null and j.job_date = today then update cleaning_jobs set arrived_at = now() where id = j.id; end if;
  return pid;
end $$;

-- Pièces de chaque ménage du nettoyeur, avec le nombre de photos avant / après par pièce.
create or replace function cleaner_job_rooms(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  return coalesce((select jsonb_object_agg(j.id, (select coalesce(jsonb_agg(jsonb_build_object('room', r.room,
        'avant', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant' and p.room = r.room),
        'apres', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres' and p.room = r.room)) order by r.n), '[]'::jsonb)
      from jsonb_array_elements_text(j.rooms) with ordinality r(room, n)))
    from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_reprendre', 'a_verifier')), '{}'::jsonb);
end $$;

-- IA : les 14 photos les plus récentes d'un type, avec leur pièce.
create or replace function automation_job_photos(p_secret text, p_job uuid, p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', encode(x.data, 'base64'), 'room', x.room)) from (select content_type, data, room from cleaning_job_photos where job_id = p_job and kind = p_kind order by created_at desc limit 14) x), '[]'::jsonb);
end $$;

-- Règles sans IA : une pièce sans photo envoie le ménage à la direction.
create or replace function cleaning_rules_reason(p_job uuid) returns text language plpgsql stable security definer set search_path = public as $$
declare j cleaning_jobs; s marketplace_settings; nb int; na int; ok_n int; mins int; miss text;
begin
  select * into j from cleaning_jobs where id = p_job;
  select * into s from marketplace_settings limit 1;
  if not coalesce(s.rules_validate, false) then return 'validation automatique par règles désactivée'; end if;
  if j.arrived_at is null then return 'le nettoyeur n''a pas pointé son arrivée'; end if;
  if j.review_note is not null then return 'ménage repris après une demande de reprise'; end if;
  if exists (select 1 from jsonb_array_elements(j.checklist) e where not coalesce((e ->> 'done')::boolean, false)) then return 'des tâches ne sont pas cochées'; end if;
  miss := cleaning_missing_rooms(j.id);
  if miss is not null then return 'photo manquante : ' || miss; end if;
  select count(*) filter (where kind = 'avant'), count(*) filter (where kind = 'apres') into nb, na from cleaning_job_photos where job_id = j.id;
  if nb < s.rules_min_photos or na < s.rules_min_photos then return format('trop peu de photos (%s avant, %s après ; il en faut %s de chaque)', nb, na, s.rules_min_photos); end if;
  mins := floor(extract(epoch from (coalesce(j.done_at, now()) - j.arrived_at)) / 60);
  if mins < s.rules_min_minutes then return format('resté %s min sur place (minimum %s)', mins, s.rules_min_minutes); end if;
  select count(*) into ok_n from cleaning_jobs o where o.cleaner_id = j.cleaner_id and o.id <> j.id and o.status = 'validee' and o.review_note is null;
  if ok_n < s.trust_jobs then return format('nettoyeur en période d''essai (%s ménage(s) validé(s) sans reprise sur %s)', ok_n, s.trust_jobs); end if;
  if exists (select 1 from (select review_note from cleaning_jobs o where o.cleaner_id = j.cleaner_id and o.id <> j.id and o.status in ('validee', 'a_reprendre') order by coalesce(o.done_at, o.created_at) desc limit 3) x where x.review_note is not null) then return 'une reprise a été demandée sur un de ses 3 derniers ménages'; end if;
  if s.spot_check_every > 0 and abs(hashtext(j.id::text)) % s.spot_check_every = 0 then return 'contrôle au hasard'; end if;
  return null;
end $$;
revoke all on function cleaning_rules_reason(uuid) from public, anon, authenticated;

-- Conciergerie : préciser les pièces d'un de ses logements.
create or replace function partner_set_rooms(p_secret text, p_listing uuid, p_rooms text[]) returns void language plpgsql security definer set search_path = public as $$
begin
  perform partner_listing(p_secret, p_listing);
  if coalesce(array_length(p_rooms, 1), 0) > 20 then raise exception 'ARGUMENT: 20 pièces au plus'; end if;
  update concierge_listings set rooms = (select array_agg(left(trim(x), 60)) from unnest(p_rooms) x where trim(x) <> '') where id = p_listing;
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_add_photo(text,uuid,text,text,text,text)', 'cleaner_job_rooms(text)', 'automation_job_photos(text,uuid,text)', 'partner_set_rooms(text,uuid,text[])'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
