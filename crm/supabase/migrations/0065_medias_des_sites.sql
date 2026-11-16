-- 0065 — Vidéos et photos des sites (envoyées par l'agent depuis son téléphone, vues par le patron) et tâche « premier passage ».
-- Stockage : un bucket privé. L'agent n'a aucune session : il demande d'abord un « emplacement » (jeton + mission vérifiés par la base),
-- et seul un fichier portant exactement ce nom, une seule fois, peut être déposé. Seul le patron lit.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('site-media', 'site-media', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;
  end if;
end $$;

create table if not exists site_media (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  intervention_id uuid references interventions(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  kind text not null check (kind in ('video', 'photo')),
  path text not null unique,
  content_type text,
  note text,
  uploaded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists site_media_site_idx on site_media (site_id, created_at desc);
alter table site_media enable row level security;
revoke all on site_media from anon;
drop policy if exists site_media_owner on site_media;
create policy site_media_owner on site_media for all to authenticated using (is_owner()) with check (is_owner());

create or replace function agent_media_slot(p_token text, p_id uuid, p_kind text, p_ext text) returns text language plpgsql security definer set search_path = public as $$
declare a staff := agent_by_token(p_token); v_site uuid; v_path text; e text := lower(coalesce(p_ext, ''));
begin
  if p_kind not in ('video', 'photo') or e not in ('mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp') then raise exception 'ARGUMENT: fichier non accepté'; end if;
  select site_id into v_site from interventions where id = p_id and staff_id = a.id;
  if not found then raise exception 'INTROUVABLE: mission introuvable'; end if;
  if v_site is null then raise exception 'ARGUMENT: cette mission n''a pas de site enregistré'; end if;
  if (select count(*) from site_media where staff_id = a.id and not uploaded and created_at > now() - interval '1 day') >= 20 then raise exception 'ARGUMENT: trop d''envois en attente'; end if;
  v_path := v_site || '/' || gen_random_uuid() || '.' || e;
  insert into site_media(site_id, intervention_id, staff_id, kind, path, content_type) values (v_site, p_id, a.id, p_kind, v_path, null);
  return v_path;
end $$;
create or replace function agent_media_done(p_token text, p_path text) returns void language plpgsql security definer set search_path = public as $$
declare a staff := agent_by_token(p_token);
begin
  update site_media set uploaded = true where path = p_path and staff_id = a.id;
end $$;
revoke all on function agent_media_slot(text, uuid, text, text), agent_media_done(text, text) from public;
grant execute on function agent_media_slot(text, uuid, text, text), agent_media_done(text, text) to anon, authenticated;

do $$ begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists site_media_slot_insert on storage.objects;
    create policy site_media_slot_insert on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'site-media' and exists (select 1 from public.site_media m where m.path = name and not m.uploaded));
    drop policy if exists site_media_owner_read on storage.objects;
    create policy site_media_owner_read on storage.objects for select to authenticated using (bucket_id = 'site-media' and public.is_owner());
    drop policy if exists site_media_owner_delete on storage.objects;
    create policy site_media_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'site-media' and public.is_owner());
  end if;
end $$;

-- Premier passage de l'entreprise sur un site ce jour-là : une tâche haute priorité pour le patron.
create or replace function automation_first_visit_tasks(p_secret text, p_day date) returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  perform automation_guard(p_secret);
  for r in select distinct on (i.site_id) i.site_id, i.start_time, c.name as client, coalesce(s.name, c.name) as place
             from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id
            where i.scheduled_date = p_day and i.site_id is not null and i.stage <> 'annulee'
              and not exists (select 1 from interventions o where o.site_id = i.site_id and o.scheduled_date < p_day and o.stage in ('terminee', 'a_verifier', 'validee', 'facturable', 'facturee'))
            order by i.site_id, i.start_time loop
    begin
      insert into jarvis_tasks(agent_key, priority, dedupe_key, title, detail) values ('core', 'haute', 'premier-passage:' || r.site_id,
        'Premier passage demain chez ' || r.place || ' : enregistrer le site',
        'Demain ' || p_day || coalesce(' à ' || to_char(r.start_time, 'HH24:MI'), '') || ', premier passage de l''entreprise chez ' || r.client || '. Faire filmer le site par l''agent (bouton « Filmer le site » dans sa mission) et photographier chaque zone ; noter accès, alarme, matériel sur place et points délicats dans la fiche du site.');
      n := n + 1;
    exception when unique_violation then null;
    end;
  end loop;
  return n;
end $$;
revoke all on function automation_first_visit_tasks(text, date) from public;
grant execute on function automation_first_visit_tasks(text, date) to anon, authenticated;
