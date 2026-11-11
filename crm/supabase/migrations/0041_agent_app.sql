-- 0041 — Application des agents de terrain : journée au planning (n'importe quel jour), rapport personnel, profil, demande d'effacement.
-- Sécurité inchangée : aucun accès direct aux tables ; chaque fonction vérifie le jeton (empreinte) et ne renvoie que les données DE CET agent.
alter table staff add column if not exists deletion_requested_at timestamptz;

-- Une mission au format de l'application (interne : jamais appelable directement).
create or replace function agent_mission_obj(p_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', i.id, 'title', i.title, 'date', i.scheduled_date, 'time', i.start_time, 'hours', i.duration_hours,
    'stage', i.stage, 'notes', i.notes, 'checklist', i.checklist,
    'client', c.name, 'site', s.name,
    'address', coalesce(i.site_address, nullif(concat_ws(', ', s.address, nullif(concat_ws(' ', s.postal_code, s.city), '')), '')),
    'access', s.access_notes, 'contact_name', s.contact_name, 'contact_phone', s.contact_phone,
    'photos', (select count(*) from mission_photos p where p.intervention_id = i.id),
    'open_issues', (select count(*) from mission_issues m where m.intervention_id = i.id and m.status = 'ouverte'),
    'arrived_at', i.arrived_at, 'departed_at', i.departed_at, 'arrived_verified', i.arrived_verified)
  from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id where i.id = p_id
$$;
revoke all on function agent_mission_obj(uuid) from public, anon, authenticated;

-- La journée d'un agent : ses missions du jour demandé (de 60 jours avant à 90 jours après aujourd'hui), annulées comprises pour l'historique.
create or replace function agent_day(p_token text, p_date date default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff; today date := (now() at time zone 'Europe/Paris')::date; d date;
begin
  a := agent_by_token(p_token);
  d := coalesce(p_date, today);   -- sans date : aujourd'hui (heure de Paris)
  if d < today - 60 or d > today + 90 then raise exception 'ARGUMENT: date hors de la période consultable'; end if;
  return jsonb_build_object('agent', a.full_name, 'today', today, 'date', d,
    'missions', (select coalesce(jsonb_agg(agent_mission_obj(i.id) order by i.start_time nulls last, i.created_at), '[]'::jsonb)
                   from interventions i where i.staff_id = a.id and i.scheduled_date = d and i.stage not in ('annulee', 'facturee')));
end $$;

-- Une mission précise de l'agent (jamais celle d'un autre).
create or replace function agent_mission(p_token text, p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff; ok boolean;
begin
  a := agent_by_token(p_token);
  select exists (select 1 from interventions i where i.id = p_id and i.staff_id = a.id) into ok;
  if not ok then raise exception 'INTROUVABLE: mission introuvable'; end if;
  return jsonb_build_object('agent', a.full_name, 'mission', agent_mission_obj(p_id));
end $$;

-- Rapport personnel : missions passées de l'agent. Validée = contrôlée par le responsable ; terminée = faite, en attente de contrôle.
create or replace function agent_report(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff; today date := (now() at time zone 'Europe/Paris')::date; done_n int; valid_n int; cancel_n int; sites_n int;
begin
  a := agent_by_token(p_token);
  select count(*) filter (where stage in ('terminee', 'a_verifier', 'validee', 'facturable', 'facturee')),
         count(*) filter (where stage in ('validee', 'facturable', 'facturee')),
         count(*) filter (where stage = 'annulee'),
         count(distinct site_id) filter (where stage in ('validee', 'facturable', 'facturee'))
    into done_n, valid_n, cancel_n, sites_n
    from interventions where staff_id = a.id and scheduled_date <= today;
  return jsonb_build_object('agent', a.full_name, 'done', done_n, 'validated', valid_n, 'cancelled', cancel_n, 'sites_checked', sites_n,
    'rate', case when done_n = 0 then 0 else round(100.0 * valid_n / done_n) end,
    'recent', (select coalesce(jsonb_agg(r.obj order by r.d desc, r.t desc nulls last), '[]'::jsonb) from (
        select i.scheduled_date d, i.start_time t, jsonb_build_object('id', i.id, 'date', i.scheduled_date, 'time', i.start_time, 'title', i.title, 'client', c.name, 'site', s.name, 'stage', i.stage) obj
          from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id
         where i.staff_id = a.id and i.scheduled_date <= today order by i.scheduled_date desc, i.start_time desc nulls last limit 100) r));
end $$;

-- Profil : identité de l'agent, nombre de missions terminées, coordonnées du responsable pour l'aide.
create or replace function agent_profile(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff;
begin
  a := agent_by_token(p_token);
  return jsonb_build_object('name', a.full_name, 'email', a.email, 'phone', a.phone,
    'missions_done', (select count(*) from interventions i where i.staff_id = a.id and i.stage in ('terminee', 'a_verifier', 'validee', 'facturable', 'facturee')),
    'company_name', (select company_name from app_settings limit 1), 'company_phone', (select company_phone from app_settings limit 1), 'company_email', (select company_email from app_settings limit 1),
    'deletion_requested_at', a.deletion_requested_at);
end $$;

-- Demande d'effacement des données personnelles : le patron la voit sur la fiche et la traite (rien n'est supprimé automatiquement).
create or replace function agent_request_deletion(p_token text) returns void language plpgsql security definer set search_path = public as $$
declare a staff;
begin
  a := agent_by_token(p_token);
  update staff set deletion_requested_at = coalesce(deletion_requested_at, now()) where id = a.id;
end $$;

do $$ declare f text; begin
  foreach f in array array['agent_day(text,date)', 'agent_mission(text,uuid)', 'agent_report(text)', 'agent_profile(text)', 'agent_request_deletion(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
