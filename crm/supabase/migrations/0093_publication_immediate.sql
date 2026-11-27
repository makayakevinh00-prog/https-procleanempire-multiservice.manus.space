-- Publication immédiate des ménages aux nettoyeurs : dès qu'un ménage entre au planning (réservation Airbnb lue, passage ajouté à la main, contrat),
-- il apparaît dans l'application des nettoyeurs, sans attendre le passage quotidien et sans ressaisie.

-- Publie UN ménage (interne : jamais appelable depuis l'extérieur). Renvoie true si une mission a été créée.
create or replace function _publish_intervention_job(p_iid uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare s marketplace_settings; today date := (now() at time zone 'Europe/Paris')::date; r record; cnt int := 0;
begin
  select * into s from marketplace_settings limit 1;
  if not coalesce(s.auto_publish, false) then return false; end if;
  select i.id as iid, i.client_id, i.title, i.scheduled_date, i.duration_hours, l.id as lid, l.cleaning_price_ht, l.cleaning_hours,
         coalesce(sx.postal_code, c.postal_code) as postal, coalesce(sx.city, c.city) as city, coalesce(sx.address, i.site_address, c.address) as addr, sx.access_notes
    into r
    from interventions i
    join clients c on c.id = i.client_id
    join lateral (
      select l2.* from concierge_listings l2
       where (i.source_key like 'conc:%' and l2.id = (select st.listing_id from concierge_stays st where st.id::text = substr(i.source_key, 6)))
          or (coalesce(i.source_key, '') not like 'conc:%' and i.title ~* '(ménage|menage|nettoyage)'
              and ((i.site_id is not null and l2.site_id = i.site_id)
                   or (l2.client_id = i.client_id and (select count(*) from concierge_listings x where x.client_id = i.client_id) = 1)))
       order by (l2.site_id = i.site_id) desc nulls last limit 1
    ) l on true
    left join sites sx on sx.id = l.site_id
   where i.id = p_iid and i.staff_id is null and i.assignee is null
     and i.scheduled_date between today and today + 60
     and i.stage not in ('annulee', 'terminee', 'a_verifier', 'validee', 'facturable', 'facturee')
     and l.cleaning_price_ht is not null and coalesce(sx.postal_code, c.postal_code) is not null and not c.is_reserved
     and not exists (select 1 from cleaning_jobs j where j.intervention_id = i.id);
  if not found then return false; end if;
  insert into cleaning_jobs(intervention_id, listing_id, client_id, title, job_date, window_start, window_end, duration_hours, city, postal_code, address, access_notes, price_ht, priority_until)
  values (r.iid, r.lid, r.client_id, r.title, r.scheduled_date, s.window_start, s.window_end, coalesce(r.cleaning_hours, r.duration_hours), r.city, r.postal, r.addr, r.access_notes, r.cleaning_price_ht,
          case when s.priority_minutes > 0 and exists (select 1 from cleaner_favorites f where f.client_id = r.client_id) then now() + make_interval(mins => s.priority_minutes) end)
  on conflict (intervention_id) do nothing;
  get diagnostics cnt = row_count;
  return cnt > 0;
end $$;
revoke all on function _publish_intervention_job(uuid) from public, anon, authenticated;

-- Passage planifié : publié tout de suite. Un échec de publication ne doit jamais bloquer le planning (il est journalisé).
create or replace function trg_publish_intervention() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin perform _publish_intervention_job(new.id);
  exception when others then raise warning 'publication du ménage % impossible : %', new.id, sqlerrm;
  end;
  return null;
end $$;
revoke all on function trg_publish_intervention() from public, anon, authenticated;

drop trigger if exists interventions_zz_publish_t on interventions;
create trigger interventions_zz_publish_t after insert or update of stage, scheduled_date, staff_id, assignee, site_id, title on interventions
  for each row when (new.staff_id is null and new.assignee is null) execute function trg_publish_intervention();

-- Passage de rattrapage (cron / synchronisation) : mêmes règles, horizon de 60 jours.
create or replace function automation_publish_cleaning_jobs(p_secret text) returns int language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/Paris')::date; n int := 0; r record;
begin
  perform automation_guard(p_secret);
  for r in select i.id from interventions i where i.staff_id is null and i.assignee is null and i.scheduled_date between today and today + 60
              and not exists (select 1 from cleaning_jobs j where j.intervention_id = i.id) loop
    if _publish_intervention_job(r.id) then n := n + 1; end if;
  end loop;
  return n;
end $$;
