-- 0008 — Interface mobile des agents : accès par lien privé révocable + photos de mission stockées en privé.
-- Compatible : uniquement des ajouts (+ remplacement de la fonction d'audit pour tracer l'agent).
-- Sécurité : l'agent n'a AUCUN accès direct aux tables. Il passe uniquement par les fonctions agent_*,
-- qui vérifient le jeton, ne voient que SES missions et ne renvoient jamais de montant, de facture ni de contrat.

alter table staff add column if not exists agent_token_hash text unique;   -- empreinte SHA-256 du lien ; le lien lui-même n'est jamais stocké
alter table staff add column if not exists agent_token_set_at timestamptz;

create table if not exists mission_photos (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references interventions(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  kind text not null check (kind in ('avant','apres','anomalie')),
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 1500000),
  data bytea not null,
  taken_at timestamptz not null default now(),
  caption text
);
create index if not exists mission_photos_mission_idx on mission_photos (intervention_id, taken_at);
alter table mission_photos enable row level security;
drop policy if exists mission_photos_owner_read on mission_photos;
drop policy if exists mission_photos_owner_delete on mission_photos;
create policy mission_photos_owner_read on mission_photos for select to authenticated using (is_owner());
create policy mission_photos_owner_delete on mission_photos for delete to authenticated using (is_owner());
-- Aucune politique d'insertion : seules les fonctions agent_* (SECURITY DEFINER) peuvent ajouter une photo.

-- Le journal sait qui agit : un agent apparaît sous son nom au lieu de « automatisation ».
create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb; k text; o jsonb; n jsonb; who text;
begin
  who := coalesce(nullif(current_setting('app.actor', true), ''), nullif(auth.jwt() ->> 'email', ''),
                  case when auth.uid() is null then 'automatisation' else auth.uid()::text end);
  if tg_op = 'UPDATE' then
    o := to_jsonb(old); n := to_jsonb(new);
    for k in select jsonb_object_keys(n) loop
      if k not in ('updated_at','stage_changed_at') and (o -> k) is distinct from (n -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
    insert into change_log(actor_id, actor, table_name, row_id, action, changes) values (auth.uid(), who, tg_table_name, new.id, 'update', diff);
    return new;
  elsif tg_op = 'INSERT' then
    insert into change_log(actor_id, actor, table_name, row_id, action) values (auth.uid(), who, tg_table_name, new.id, 'insert');
    return new;
  else
    insert into change_log(actor_id, actor, table_name, row_id, action, changes) values (auth.uid(), who, tg_table_name, old.id, 'delete', to_jsonb(old));
    return old;
  end if;
end $$;

-- ───────────────────────── Fonctions agent ─────────────────────────
-- Interne : retrouve l'agent actif d'un jeton. Message identique pour tout échec (aucune information sur l'existence d'un jeton).
create or replace function agent_by_token(p_token text) returns staff
language plpgsql security definer set search_path = public as $$
declare s staff;
begin
  if p_token is null or length(p_token) < 32 then raise exception 'ACCES_REFUSE: lien invalide ou expiré — demandez un nouveau lien à votre responsable.'; end if;
  select * into s from staff where agent_token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') and active;
  if not found then raise exception 'ACCES_REFUSE: lien invalide ou expiré — demandez un nouveau lien à votre responsable.'; end if;
  perform set_config('app.actor', 'Agent : ' || s.full_name, true);
  return s;
end $$;
revoke all on function agent_by_token(text) from public, anon, authenticated;

create or replace function agent_missions(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a staff; today date := (now() at time zone 'Europe/Paris')::date;
begin
  a := agent_by_token(p_token);
  return jsonb_build_object(
    'agent', a.full_name, 'today', today,
    'missions', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'title', i.title, 'date', i.scheduled_date, 'time', i.start_time, 'hours', i.duration_hours,
        'stage', i.stage, 'notes', i.notes, 'checklist', i.checklist,
        'client', c.name, 'site', s.name,
        'address', coalesce(i.site_address, nullif(concat_ws(', ', s.address, nullif(concat_ws(' ', s.postal_code, s.city), '')), '')),
        'access', s.access_notes, 'contact_name', s.contact_name, 'contact_phone', s.contact_phone,
        'photos', (select count(*) from mission_photos p where p.intervention_id = i.id),
        'open_issues', (select count(*) from mission_issues m where m.intervention_id = i.id and m.status = 'ouverte')
      ) order by i.scheduled_date, i.start_time nulls last), '[]'::jsonb)
      from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id
      where i.staff_id = a.id and i.scheduled_date between today - 1 and today + 7 and i.stage not in ('annulee','facturee'))
  );
end $$;

create or replace function agent_set_stage(p_token text, p_id uuid, p_stage text) returns text
language plpgsql security definer set search_path = public as $$
declare a staff; m interventions; order_ text[] := array['en_route','arrivee','en_cours','terminee']; cur int; tgt int; unchecked int; open_issues int;
begin
  a := agent_by_token(p_token);
  select * into m from interventions where id = p_id and staff_id = a.id;
  if not found then raise exception 'MISSION_INTROUVABLE: cette mission ne vous est pas affectée.'; end if;
  if m.invoice_id is not null or m.stage in ('a_verifier','validee','facturable','facturee','annulee') then
    raise exception 'ETAPE_INTERDITE: cette mission n''est plus modifiable par l''agent.';
  end if;
  tgt := array_position(order_, p_stage);
  cur := coalesce(array_position(order_, m.stage), 0);   -- planifiée / affectée = 0
  if tgt is null or tgt <= cur then raise exception 'ETAPE_INTERDITE: étape impossible depuis « % ».', m.stage; end if;
  if p_stage = 'terminee' then
    select count(*) into unchecked from jsonb_array_elements(m.checklist) e where not coalesce((e ->> 'done')::boolean, false);
    select count(*) into open_issues from mission_issues where intervention_id = m.id and status = 'ouverte';
    if unchecked > 0 and open_issues = 0 then
      raise exception 'CHECKLIST_INCOMPLETE: % point(s) de la check-list ne sont pas cochés (ou signalez une anomalie).', unchecked;
    end if;
  end if;
  update interventions set stage = p_stage where id = m.id;
  return p_stage;
end $$;

create or replace function agent_toggle_check(p_token text, p_id uuid, p_index int, p_done boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a staff; m interventions; list jsonb;
begin
  a := agent_by_token(p_token);
  select * into m from interventions where id = p_id and staff_id = a.id;
  if not found then raise exception 'MISSION_INTROUVABLE: cette mission ne vous est pas affectée.'; end if;
  if m.invoice_id is not null or m.stage in ('validee','facturable','facturee','annulee') then
    raise exception 'ETAPE_INTERDITE: cette mission n''est plus modifiable par l''agent.';
  end if;
  if p_index < 0 or p_index >= jsonb_array_length(m.checklist) then raise exception 'POINT_INTROUVABLE: point de la check-list introuvable.'; end if;
  list := jsonb_set(m.checklist, array[p_index::text, 'done'], to_jsonb(coalesce(p_done, false)));
  update interventions set checklist = list where id = m.id;
  return list;
end $$;

create or replace function agent_report_issue(p_token text, p_id uuid, p_description text, p_severity text default 'normale') returns uuid
language plpgsql security definer set search_path = public as $$
declare a staff; m interventions; iid uuid;
begin
  a := agent_by_token(p_token);
  select * into m from interventions where id = p_id and staff_id = a.id;
  if not found then raise exception 'MISSION_INTROUVABLE: cette mission ne vous est pas affectée.'; end if;
  if p_description is null or length(trim(p_description)) < 3 then raise exception 'DESCRIPTION_VIDE: décrivez le problème en quelques mots.'; end if;
  insert into mission_issues(kind, intervention_id, site_id, client_id, severity, description, reported_by)
    values ('anomalie', m.id, m.site_id, m.client_id, case when p_severity in ('faible','haute') then p_severity else 'normale' end, left(trim(p_description), 2000), a.full_name)
    returning id into iid;
  return iid;
end $$;

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
  if n >= 20 then raise exception 'PHOTO_INVALIDE: 20 photos maximum par mission.'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'PHOTO_INVALIDE: photo vide ou trop lourde (1,5 Mo maximum).'; end if;
  insert into mission_photos(intervention_id, staff_id, kind, content_type, size_bytes, data)
    values (m.id, a.id, p_kind, p_content_type, octet_length(bytes), bytes) returning id into pid;
  return pid;
end $$;

do $$
declare f text;
begin
  foreach f in array array['agent_missions(text)', 'agent_set_stage(text,uuid,text)', 'agent_toggle_check(text,uuid,int,boolean)',
                           'agent_report_issue(text,uuid,text,text)', 'agent_add_photo(text,uuid,text,text,text)']
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

-- Fonction de déclencheur : jamais appelable directement (les triggers continuent de fonctionner).
revoke all on function audit_row() from public, anon, authenticated;
