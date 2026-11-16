-- 0064 — Les passages générés depuis un contrat reprennent le site et la personne affectée du contrat (ils apparaissent alors dans son application),
-- et le planning est rempli loin devant (voir le passage quotidien : 12 mois, dans la limite de la fin du contrat).
create or replace function automation_insert_interventions(p_secret text, p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform automation_guard(p_secret);
  insert into interventions(client_id, contract_id, title, scheduled_date, start_time, duration_hours, site_address, billable, unit_price_ht, assignee, source_key, site_id, staff_id, stage)
  select x.client_id, x.contract_id, x.title, x.scheduled_date, x.start_time, x.duration_hours, x.site_address, x.billable, x.unit_price_ht,
         coalesce(x.assignee, k.assignee), x.source_key, k.site_id, k.staff_id, case when k.staff_id is not null then 'affectee' else 'planifiee' end
  from jsonb_to_recordset(p_rows) as x(client_id uuid, contract_id uuid, title text, scheduled_date date, start_time time, duration_hours numeric,
                                       site_address text, billable boolean, unit_price_ht numeric, assignee text, source_key text)
  left join contracts k on k.id = x.contract_id
  on conflict (source_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
