-- 0055 — Validation automatique SANS IA : règles (pointage, tâches, photos, durée), confiance (nettoyeur éprouvé) et contrôles au hasard.
-- Utilisée quand l'analyse par l'IA est indisponible. Tout ménage qui ne passe pas les règles va à la direction, avec la raison.
alter table marketplace_settings add column if not exists rules_validate boolean not null default true;
alter table marketplace_settings add column if not exists rules_min_photos int not null default 2 check (rules_min_photos between 1 and 20);
alter table marketplace_settings add column if not exists rules_min_minutes int not null default 30 check (rules_min_minutes between 0 and 600);
alter table marketplace_settings add column if not exists trust_jobs int not null default 3 check (trust_jobs between 0 and 100);
alter table marketplace_settings add column if not exists spot_check_every int not null default 5 check (spot_check_every between 0 and 100);
alter table cleaning_jobs add column if not exists check_note text;
alter table cleaning_jobs drop constraint if exists cleaning_jobs_validated_by_check;
alter table cleaning_jobs add constraint cleaning_jobs_validated_by_check check (validated_by is null or validated_by in ('ia', 'direction', 'regles'));

-- Pourquoi ce ménage doit être vu par la direction (null = il passe toutes les règles).
create or replace function cleaning_rules_reason(p_job uuid) returns text language plpgsql stable security definer set search_path = public as $$
declare j cleaning_jobs; s marketplace_settings; nb int; na int; ok_n int; mins int;
begin
  select * into j from cleaning_jobs where id = p_job;
  select * into s from marketplace_settings limit 1;
  if not coalesce(s.rules_validate, false) then return 'validation automatique par règles désactivée'; end if;
  if j.arrived_at is null then return 'le nettoyeur n''a pas pointé son arrivée'; end if;
  if j.review_note is not null then return 'ménage repris après une demande de reprise'; end if;
  if exists (select 1 from jsonb_array_elements(j.checklist) e where not coalesce((e ->> 'done')::boolean, false)) then return 'des tâches ne sont pas cochées'; end if;
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

-- Applique les règles à un ménage « à vérifier » : validé (le nettoyeur peut partir) ou laissé à la direction avec la raison.
create or replace function automation_rules_validate(p_secret text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare j cleaning_jobs; why text;
begin
  perform automation_guard(p_secret);
  select * into j from cleaning_jobs where id = p_job for update;
  if not found or j.status <> 'a_verifier' then return jsonb_build_object('validated', false, 'reason', 'ce ménage n''est pas en attente de vérification'); end if;
  why := cleaning_rules_reason(j.id);
  if why is null then
    update cleaning_jobs set status = 'validee', validated_at = now(), validated_by = 'regles', departure = 'partir', check_note = null where id = j.id;
    if j.intervention_id is not null then update interventions set stage = 'validee' where id = j.intervention_id; end if;
    return jsonb_build_object('validated', true, 'reason', null);
  end if;
  update cleaning_jobs set check_note = left(why, 300) where id = j.id;
  return jsonb_build_object('validated', false, 'reason', why);
end $$;
revoke all on function automation_rules_validate(text, uuid) from public;
grant execute on function automation_rules_validate(text, uuid) to anon, authenticated;
