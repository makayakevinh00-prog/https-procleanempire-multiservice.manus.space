drop trigger if exists interventions_zz_publish_t on interventions;
drop function if exists trg_publish_intervention();
-- Rétablit la version d'origine (0045), sans _publish_intervention_job.
create or replace function automation_publish_cleaning_jobs(p_secret text) returns int language plpgsql security definer set search_path = public as $$
declare s marketplace_settings; today date := (now() at time zone 'Europe/Paris')::date; n int := 0; r record;
begin
  perform automation_guard(p_secret);
  select * into s from marketplace_settings limit 1;
  if not coalesce(s.auto_publish, false) then return 0; end if;
  for r in
    select i.id as iid, i.client_id, i.title, i.scheduled_date, i.duration_hours, i.site_address, l.id as lid, l.cleaning_price_ht, l.cleaning_hours,
           coalesce(sx.postal_code, c.postal_code) as postal, coalesce(sx.city, c.city) as city, coalesce(sx.address, i.site_address, c.address) as addr, sx.access_notes
      from interventions i
      join concierge_stays st on st.id::text = substr(i.source_key, 6)
      join concierge_listings l on l.id = st.listing_id
      join clients c on c.id = i.client_id
      left join sites sx on sx.id = l.site_id
     where i.source_key like 'conc:%' and i.staff_id is null and i.assignee is null
       and i.scheduled_date between today and today + 30 and i.stage not in ('annulee', 'terminee', 'a_verifier', 'validee', 'facturable', 'facturee')
       and l.cleaning_price_ht is not null and coalesce(sx.postal_code, c.postal_code) is not null and not c.is_reserved
       and not exists (select 1 from cleaning_jobs j where j.intervention_id = i.id)
  loop
    insert into cleaning_jobs(intervention_id, listing_id, client_id, title, job_date, window_start, window_end, duration_hours, city, postal_code, address, access_notes, price_ht, priority_until)
    values (r.iid, r.lid, r.client_id, r.title, r.scheduled_date, s.window_start, s.window_end, coalesce(r.cleaning_hours, r.duration_hours), r.city, r.postal, r.addr, r.access_notes, r.cleaning_price_ht,
            case when s.priority_minutes > 0 and exists (select 1 from cleaner_favorites f where f.client_id = r.client_id) then now() + make_interval(mins => s.priority_minutes) end);
    n := n + 1;
  end loop;
  return n;
end $$;
drop function if exists _publish_intervention_job(uuid);
