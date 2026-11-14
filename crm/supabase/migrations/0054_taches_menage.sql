-- 0054 — Tâches à cocher d'un ménage. À l'acceptation, la liste est copiée sur le ménage : le guide du logement s'il existe, sinon la liste standard (réglable).
-- Pour terminer, tout doit être coché — ou le nettoyeur explique pourquoi dans son mot à la direction.
alter table marketplace_settings add column if not exists default_checklist text[] not null default array[
  'Aérer le logement', 'Ramasser et sortir les poubelles', 'Faire le lit avec du linge propre', 'Nettoyer la cuisine (plan de travail, plaques, évier)',
  'Nettoyer la salle de bain et les WC', 'Dépoussiérer les surfaces', 'Aspirer et laver les sols', 'Remettre les serviettes et les consommables',
  'Vérifier qu''il ne reste aucun objet du voyageur', 'Fermer fenêtres et lumières, remettre les clés'];
alter table cleaning_jobs add column if not exists checklist jsonb not null default '[]'::jsonb;

create or replace function cleaning_job_tasks(p_listing uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g jsonb; t jsonb;
begin
  if p_listing is not null and to_regprocedure('cleaning_job_guide(uuid)') is not null then g := cleaning_job_guide(p_listing); end if;
  if g is not null and jsonb_typeof(g -> 'rooms') = 'array' then
    select jsonb_agg(jsonb_build_object('label', left((r.value ->> 'room') || ' : ' || s.value, 200), 'done', false)) into t
      from (select * from jsonb_array_elements(g -> 'rooms') with ordinality) r(value, n), lateral (select * from jsonb_array_elements_text(r.value -> 'steps') with ordinality) s(value, m)
     where r.n <= 12 and s.m <= 6;
  end if;
  if t is null or jsonb_array_length(t) = 0 then
    select coalesce(jsonb_agg(jsonb_build_object('label', left(x, 200), 'done', false)), '[]'::jsonb) into t from (select unnest(default_checklist) x from marketplace_settings limit 40) d where trim(x) <> '';
  end if;
  return coalesce(t, '[]'::jsonb);
end $$;
revoke all on function cleaning_job_tasks(uuid) from public, anon, authenticated;

create or replace function cleaning_jobs_tasks_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- La liste est fixée quand un nettoyeur accepte (elle ne change plus ensuite, même si le guide est refait).
  if new.status = 'acceptee' and (tg_op = 'INSERT' or old.status is distinct from 'acceptee') and jsonb_array_length(new.checklist) = 0 then
    new.checklist := cleaning_job_tasks(new.listing_id);
  end if;
  -- Terminer : tout coché, ou un mot d'explication.
  if tg_op = 'UPDATE' and new.status = 'a_verifier' and old.status in ('acceptee', 'a_reprendre')
     and exists (select 1 from jsonb_array_elements(new.checklist) e where not coalesce((e ->> 'done')::boolean, false))
     and coalesce(trim(new.cleaner_note), '') = '' then
    raise exception 'INDISPONIBLE: il reste des tâches non cochées : cochez-les, ou expliquez pourquoi dans le mot pour la direction';
  end if;
  return new;
end $$;
drop trigger if exists cleaning_jobs_tasks on cleaning_jobs;
create trigger cleaning_jobs_tasks before insert or update of status on cleaning_jobs for each row execute function cleaning_jobs_tasks_trg();

-- Les listes de tâches des ménages du nettoyeur (par ménage).
create or replace function cleaner_checklists(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  return coalesce((select jsonb_object_agg(j.id, j.checklist) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_reprendre', 'a_verifier')), '{}'::jsonb);
end $$;

-- Cocher / décocher une tâche de SON ménage, le jour du ménage.
create or replace function cleaner_check_task(p_token text, p_job uuid, p_index int, p_done boolean) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id for update;
  if not found or j.status not in ('acceptee', 'a_reprendre') then raise exception 'INDISPONIBLE: ce ménage n''est plus à faire'; end if;
  if j.job_date > (now() at time zone 'Europe/Paris')::date then raise exception 'INDISPONIBLE: les tâches se cochent le jour du ménage'; end if;
  if p_index is null or p_index < 0 or p_index >= jsonb_array_length(j.checklist) then raise exception 'ARGUMENT: tâche inconnue'; end if;
  update cleaning_jobs set checklist = jsonb_set(checklist, array[p_index::text, 'done'], to_jsonb(coalesce(p_done, false))) where id = j.id;
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_checklists(text)', 'cleaner_check_task(text,uuid,int,boolean)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
