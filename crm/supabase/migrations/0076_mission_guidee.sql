-- 0076 — Mission guidée. Le nettoyeur ne fait que filmer : les captures sont tirées de la vidéo, l'IA les classe par pièce
-- et fixe la liste des tâches dans l'ordre. Les captures arrivent à l'IA dans l'ordre du film (les 16 dernières).
create or replace function automation_job_photos(p_secret text, p_job uuid, p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', encode(x.data, 'base64'), 'room', x.room) order by x.created_at, x.id)
                     from (select id, content_type, data, room, created_at from cleaning_job_photos where job_id = p_job and kind = p_kind order by created_at desc, id desc limit 16) x), '[]'::jsonb);
end $$;

-- Liste des tâches fixée par l'IA d'après la vidéo d'arrivée. Sans effet si une tâche est déjà cochée ou si le ménage n'est plus à faire.
create or replace function automation_set_job_tasks(p_secret text, p_job uuid, p_tasks jsonb) returns void language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs; t jsonb;
begin
  perform automation_guard(p_secret);
  if p_tasks is null or jsonb_typeof(p_tasks) <> 'array' then return; end if;
  select * into j from cleaning_jobs where id = p_job for update;
  if not found or j.status not in ('acceptee', 'a_reprendre') then return; end if;
  if exists (select 1 from jsonb_array_elements(j.checklist) e where coalesce((e ->> 'done')::boolean, false)) then return; end if;
  select coalesce(jsonb_agg(jsonb_build_object('label', left(trim(x.v), 200), 'done', false) order by x.n), '[]'::jsonb) into t
    from jsonb_array_elements_text(p_tasks) with ordinality x(v, n) where trim(x.v) <> '' and x.n <= 14;
  if jsonb_array_length(t) = 0 then return; end if;
  update cleaning_jobs set checklist = t where id = j.id;
end $$;

-- Captures tirées d'une vidéo : sans pièce choisie par le nettoyeur, elles comptent pour toutes les pièces (l'IA les classe).
create or replace function cleaning_missing_rooms(p_job uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from cleaning_job_photos p where p.job_id = p_job and p.kind = 'avant' and p.room is null)
     and exists (select 1 from cleaning_job_photos p where p.job_id = p_job and p.kind = 'apres' and p.room is null) then null
    else (select string_agg(m.room || ' (' || m.what || ')', ', ' order by m.n)
            from (select r.room, r.n, case when not a.has and not b.has then 'avant et après' when not a.has then 'avant' else 'après' end as what, a.has ha, b.has hb
                    from cleaning_jobs j, jsonb_array_elements_text(j.rooms) with ordinality r(room, n),
                         lateral (select exists (select 1 from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant' and p.room = r.room) has) a,
                         lateral (select exists (select 1 from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres' and p.room = r.room) has) b
                   where j.id = p_job) m
           where not m.ha or not m.hb)
  end
$$;
revoke all on function cleaning_missing_rooms(uuid) from public, anon, authenticated;

revoke all on function automation_set_job_tasks(text, uuid, jsonb) from public;
grant execute on function automation_set_job_tasks(text, uuid, jsonb) to anon, authenticated;
