-- 0079 — Agents ProClean : film d'arrivée et de fin analysés par l'IA, comme pour les nettoyeurs indépendants.
-- L'IA connaît le site (zones, tâches attendues, points d'attention, particularités saisis dans le CRM).
alter table interventions add column if not exists before_report jsonb;
alter table interventions add column if not exists ai_report jsonb;
alter table interventions add column if not exists ai_status text;
-- Élément du jour quand le site tourne (une étagère différente à chaque passage) : fixé à l'arrivée, une fois par mission.
alter table interventions add column if not exists rotation_item text;
-- Le site se souvient de ce que l'IA y a vu (zones, état habituel) et de sa rotation : {"items": ["Étagère 1", …], "next": 0}.
alter table sites add column if not exists visit_memory jsonb;
alter table sites add column if not exists rotation jsonb;

-- À l'arrivée pointée, la mission reçoit l'élément du jour et le site passe au suivant (une seule fois par mission).
create or replace function interventions_rotation() returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb; n int; k int;
begin
  if new.arrived_at is null or old.arrived_at is not null or new.rotation_item is not null or new.site_id is null then return new; end if;
  select rotation into r from sites where id = new.site_id for update;
  if r is null or jsonb_typeof(r -> 'items') <> 'array' then return new; end if;
  n := jsonb_array_length(r -> 'items');
  if n = 0 then return new; end if;
  k := mod(greatest(coalesce((r ->> 'next')::int, 0), 0), n);
  new.rotation_item := r -> 'items' ->> k;
  update sites set rotation = jsonb_set(r, '{next}', to_jsonb(mod(k + 1, n))) where id = new.site_id;
  return new;
end $$;
drop trigger if exists interventions_rotation_t on interventions;
create trigger interventions_rotation_t before update of arrived_at on interventions for each row execute function interventions_rotation();

-- La mission vue par l'agent : relevé d'arrivée, contrôle de fin et nombre d'images par moment.
create or replace function agent_mission_obj(p_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', i.id, 'title', i.title, 'date', i.scheduled_date, 'time', i.start_time, 'hours', i.duration_hours,
    'stage', i.stage, 'notes', i.notes, 'checklist', i.checklist,
    'client', c.name, 'site', s.name,
    'address', coalesce(i.site_address, nullif(concat_ws(', ', s.address, nullif(concat_ws(' ', s.postal_code, s.city), '')), '')),
    'access', s.access_notes, 'contact_name', s.contact_name, 'contact_phone', s.contact_phone,
    'photos', (select count(*) from mission_photos p where p.intervention_id = i.id),
    'photos_before', (select count(*) from mission_photos p where p.intervention_id = i.id and p.kind = 'avant'),
    'photos_after', (select count(*) from mission_photos p where p.intervention_id = i.id and p.kind = 'apres'),
    'before_report', i.before_report, 'ai_report', i.ai_report, 'ai_status', i.ai_status, 'rotation_item', i.rotation_item,
    'open_issues', (select count(*) from mission_issues m where m.intervention_id = i.id and m.status = 'ouverte'),
    'arrived_at', i.arrived_at, 'departed_at', i.departed_at, 'arrived_verified', i.arrived_verified)
  from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id where i.id = p_id
$$;
revoke all on function agent_mission_obj(uuid) from public, anon, authenticated;

-- Images de mission : un film donne jusqu'à 14 captures à l'arrivée et autant à la fin, d'où 60 images au plus (au lieu de 20).
create or replace function agent_add_photo(p_token text, p_id uuid, p_kind text, p_content_type text, p_data_b64 text) returns uuid
language plpgsql security definer set search_path = public as $$
declare a staff; m interventions; bytes bytea; pid uuid; n int;
begin
  a := agent_by_token(p_token);
  select * into m from interventions where id = p_id and staff_id = a.id;
  if not found then raise exception 'MISSION_INTROUVABLE: cette mission ne vous est pas affectée.'; end if;
  if m.invoice_id is not null or m.stage in ('validee','facturable','facturee','annulee') then
    raise exception 'ETAPE_INTERDITE: cette mission n''est plus modifiable par l''agent.';
  end if;
  if p_kind not in ('avant','apres','anomalie') then raise exception 'PHOTO_INVALIDE: type de photo inconnu.'; end if;
  if p_content_type not in ('image/jpeg','image/png','image/webp') then raise exception 'PHOTO_INVALIDE: format non accepté (JPEG, PNG ou WebP).'; end if;
  select count(*) into n from mission_photos where intervention_id = m.id;
  if n >= 60 then raise exception 'PHOTO_INVALIDE: 60 images maximum par mission.'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'PHOTO_INVALIDE: photo vide ou trop lourde (1,5 Mo maximum).'; end if;
  insert into mission_photos(intervention_id, staff_id, kind, content_type, size_bytes, data)
    values (m.id, a.id, p_kind, p_content_type, octet_length(bytes), bytes) returning id into pid;
  return pid;
end $$;

-- L'agent demande (ou relance) l'analyse : la mission doit être la sienne et encore en cours.
create or replace function agent_can_analyse(p_token text, p_id uuid) returns boolean language plpgsql stable security definer set search_path = public as $$
declare a staff;
begin
  a := agent_by_token(p_token);
  return exists (select 1 from interventions i where i.id = p_id and i.staff_id = a.id and i.invoice_id is null and i.stage not in ('validee','facturable','facturee','annulee'));
end $$;
revoke all on function agent_can_analyse(text, uuid) from public;
grant execute on function agent_can_analyse(text, uuid) to anon, authenticated;

-- Pour l'IA : ce que l'on sait de la mission et du site (zones, tâches attendues, points d'attention, particularités).
create or replace function automation_mission_brief(p_secret text, p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return (select jsonb_build_object('title', i.title, 'date', i.scheduled_date, 'stage', i.stage, 'client', c.name, 'site', s.name,
      'zones', case when jsonb_typeof(s.zones) = 'array' then s.zones else '[]'::jsonb end,
      'specifics', coalesce(to_jsonb(s.specifics), '[]'::jsonb), 'site_notes', s.notes, 'notes', i.notes,
      'checklist', coalesce(i.checklist, '[]'::jsonb), 'before_report', i.before_report, 'ai_report', i.ai_report,
      'rotation_item', i.rotation_item, 'memory', s.visit_memory, 'has_site', i.site_id is not null,
      'agent', (select split_part(trim(full_name), ' ', 1) from staff where id = i.staff_id))
    from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id where i.id = p_id);
end $$;

-- Pour l'IA : les 16 images les plus récentes d'un moment (arrivée ou fin), dans l'ordre du film.
create or replace function automation_mission_photos(p_secret text, p_id uuid, p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', replace(encode(x.data, 'base64'), E'\n', '')) order by x.taken_at, x.id)
                     from (select id, content_type, data, taken_at from mission_photos where intervention_id = p_id and kind = p_kind order by taken_at desc, id desc limit 16) x), '[]'::jsonb);
end $$;

-- Enregistre le relevé d'arrivée (« avant ») ou le contrôle de fin (« apres ») rendu par l'IA. L'étape de la mission ne change jamais.
-- À l'arrivée, les tâches de l'IA deviennent la check-list seulement si le site n'en a pas (ou si elle venait déjà de l'IA) et que rien n'est coché.
create or replace function automation_set_mission_analysis(p_secret text, p_id uuid, p_kind text, p_report jsonb, p_status text, p_tasks jsonb default null, p_memory jsonb default null) returns void language plpgsql security definer set search_path = public as $$
declare m interventions; own boolean; t jsonb;
begin
  perform automation_guard(p_secret);
  select * into m from interventions where id = p_id;
  if not found then return; end if;
  if p_kind = 'avant' then
    update interventions set before_report = p_report where id = p_id;
    -- Le site retient ce qui a été vu : les prochains passages (et les prochains agents) partent de là.
    if p_memory is not null and m.site_id is not null then update sites set visit_memory = p_memory where id = m.site_id; end if;
    own := not exists (select 1 from jsonb_array_elements(coalesce(m.checklist, '[]'::jsonb)) e where coalesce((e ->> 'ai')::boolean, false) = false or coalesce((e ->> 'done')::boolean, false));
    if own and p_tasks is not null and jsonb_typeof(p_tasks) = 'array' and m.invoice_id is null and m.stage not in ('terminee','a_verifier','validee','facturable','facturee','annulee') then
      select jsonb_agg(jsonb_build_object('label', left(trim(x.v), 160), 'done', false, 'ai', true) order by x.n) into t
        from (select v, n from jsonb_array_elements_text(p_tasks) with ordinality e(v, n) where trim(v) <> '' order by n limit 14) x;
      if t is not null then update interventions set checklist = t where id = p_id; end if;
    end if;
  elsif p_kind = 'apres' then
    update interventions set ai_report = p_report, ai_status = case when p_status in ('ok', 'reprise', 'indisponible') then p_status else null end where id = p_id;
  end if;
end $$;

revoke all on function automation_mission_brief(text, uuid), automation_mission_photos(text, uuid, text), automation_set_mission_analysis(text, uuid, text, jsonb, text, jsonb, jsonb) from public;
grant execute on function automation_mission_brief(text, uuid), automation_mission_photos(text, uuid, text), automation_set_mission_analysis(text, uuid, text, jsonb, text, jsonb, jsonb) to anon, authenticated;
