-- Pointage GPS sur place : position du site, heures d'arrivée et de départ vérifiées.
alter table sites add column if not exists lat double precision, add column if not exists lng double precision,
  add column if not exists geofence_m int not null default 150, add column if not exists geocoded_at timestamptz;

alter table interventions
  add column if not exists arrived_at timestamptz, add column if not exists arrived_distance_m int, add column if not exists arrived_accuracy_m int, add column if not exists arrived_verified boolean,
  add column if not exists departed_at timestamptz, add column if not exists departed_distance_m int, add column if not exists departed_verified boolean;

create or replace function geo_distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision) returns int
language sql immutable as $$
  select round(2 * 6371000 * asin(sqrt(sin(radians(lat2 - lat1) / 2) ^ 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2)))::int
$$;

-- Arrivée : la position du téléphone doit être dans le rayon du site (ou le site n'a pas de position : arrivée enregistrée « non vérifiée »).
create or replace function agent_check_in(p_token text, p_id uuid, p_lat double precision, p_lng double precision, p_acc double precision default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a staff; m interventions; s sites; dist int; verified boolean := null; allowed int;
begin
  a := agent_by_token(p_token);
  select * into m from interventions where id = p_id and staff_id = a.id;
  if not found then raise exception 'MISSION_INTROUVABLE: cette mission ne vous est pas affectée.'; end if;
  if m.invoice_id is not null or m.stage in ('a_verifier','validee','facturable','facturee','annulee','terminee') then
    raise exception 'ETAPE_INTERDITE: cette mission n''est plus modifiable par l''agent.';
  end if;
  if m.arrived_at is not null then return jsonb_build_object('ok', true, 'already', true, 'arrived_at', m.arrived_at); end if;
  if p_lat is null or p_lng is null then raise exception 'POSITION_ABSENTE: votre position n''a pas pu être lue. Autorisez la localisation puis réessayez.'; end if;
  if m.site_id is not null then select * into s from sites where id = m.site_id; end if;
  if s.id is not null and s.lat is not null and s.lng is not null then
    dist := geo_distance_m(p_lat, p_lng, s.lat, s.lng);
    allowed := s.geofence_m + least(coalesce(p_acc, 0), 100)::int;
    if dist > allowed then
      raise exception 'TROP_LOIN: vous êtes à environ % m du site (rayon autorisé : % m). Rapprochez-vous de l''adresse puis réessayez.', dist, s.geofence_m;
    end if;
    verified := true;
  else
    verified := false;
  end if;
  update interventions set arrived_at = now(), arrived_distance_m = dist, arrived_accuracy_m = p_acc::int, arrived_verified = verified,
    stage = case when stage in ('planifiee','affectee','en_route') then 'arrivee' else stage end where id = m.id;
  return jsonb_build_object('ok', true, 'arrived_at', now(), 'verified', coalesce(verified, false), 'distance_m', dist);
end $$;

-- Fin de mission : contrôle de la check-list (comme avant) puis heure de départ ; la position est relevée mais ne bloque pas la fin.
create or replace function agent_finish(p_token text, p_id uuid, p_lat double precision default null, p_lng double precision default null, p_acc double precision default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a staff; m interventions; s sites; dist int; verified boolean := null;
begin
  a := agent_by_token(p_token);
  perform agent_set_stage(p_token, p_id, 'terminee');
  select * into m from interventions where id = p_id and staff_id = a.id;
  if m.site_id is not null then select * into s from sites where id = m.site_id; end if;
  if p_lat is not null and p_lng is not null and s.id is not null and s.lat is not null then
    dist := geo_distance_m(p_lat, p_lng, s.lat, s.lng);
    verified := dist <= s.geofence_m + least(coalesce(p_acc, 0), 100)::int;
  end if;
  update interventions set departed_at = coalesce(departed_at, now()), departed_distance_m = dist, departed_verified = verified where id = m.id;
  return jsonb_build_object('ok', true, 'departed_at', now(), 'verified', coalesce(verified, false));
end $$;

revoke all on function agent_check_in(text, uuid, double precision, double precision, double precision) from public;
revoke all on function agent_finish(text, uuid, double precision, double precision, double precision) from public;
grant execute on function agent_check_in(text, uuid, double precision, double precision, double precision) to anon, authenticated;
grant execute on function agent_finish(text, uuid, double precision, double precision, double precision) to anon, authenticated;

-- agent_missions : expose arrivée / départ à l'application de l'agent.
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
        'open_issues', (select count(*) from mission_issues m where m.intervention_id = i.id and m.status = 'ouverte'),
        'arrived_at', i.arrived_at, 'departed_at', i.departed_at, 'arrived_verified', i.arrived_verified
      ) order by i.scheduled_date, i.start_time nulls last), '[]'::jsonb)
      from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id
      where i.staff_id = a.id and i.scheduled_date between today - 1 and today + 7 and i.stage not in ('annulee','facturee'))
  );
end $$;
