-- 0057 — Tableau de bord de l'espace conciergerie : chiffres du mois, ménages à venir, prix de chaque ménage.
create or replace function partner_overview(p_secret text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare cid uuid := partner_client(p_secret); today date := (now() at time zone 'Europe/Paris')::date; m0 date := date_trunc('month', (now() at time zone 'Europe/Paris'))::date;
begin
  return jsonb_build_object('name', (select name from clients where id = cid), 'has_api_key', (select api_key_hash is not null from partner_access where client_id = cid), 'today', today,
    'stats', jsonb_build_object(
      'upcoming', (select count(*) from cleaning_jobs j where j.client_id = cid and j.status in ('ouverte', 'acceptee', 'a_reprendre') and j.job_date between today and today + 7),
      'searching', (select count(*) from cleaning_jobs j where j.client_id = cid and j.status = 'ouverte' and j.job_date >= today),
      'in_progress', (select count(*) from cleaning_jobs j where j.client_id = cid and j.job_date = today and j.status in ('acceptee', 'a_reprendre', 'a_verifier')),
      'done_month', (select count(*) from cleaning_jobs j where j.client_id = cid and j.status = 'validee' and j.job_date >= m0),
      'spend_month', coalesce((select sum(j.price_ht) from cleaning_jobs j where j.client_id = cid and j.status = 'validee' and j.job_date >= m0), 0),
      'done_total', (select count(*) from cleaning_jobs j where j.client_id = cid and j.status = 'validee'),
      'redo_month', (select count(*) from cleaning_jobs j where j.client_id = cid and j.job_date >= m0 and j.review_note is not null)),
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'platform', l.platform, 'has_ical', l.ical_url is not null, 'last_sync_at', l.last_sync_at, 'last_sync_error', l.last_sync_error,
        'price', l.cleaning_price_ht, 'checkout_time', l.checkout_time, 'address', s.address, 'postal_code', s.postal_code, 'city', s.city, 'access_notes', s.access_notes,
        'linen_clean', l.linen_clean, 'linen_dirty', l.linen_dirty, 'linen_per_stay', l.linen_per_stay, 'has_guide', l.ref_guide is not null, 'rooms', l.rooms,
        'ref_photos', (select count(*) from listing_ref_photos p where p.listing_id = l.id),
        'next_checkout', (select min(check_out) from concierge_stays st where st.listing_id = l.id and not st.cancelled and st.check_out >= today),
        'stays', (select count(*) from concierge_stays st where st.listing_id = l.id and not st.cancelled and st.check_out >= today)) order by l.name)
      from concierge_listings l left join sites s on s.id = l.site_id where l.client_id = cid), '[]'::jsonb),
    'jobs', coalesce((select jsonb_agg(x.o order by x.d) from (select j.job_date d, jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'status', j.status, 'city', j.city, 'price', j.price_ht,
        'window_start', j.window_start, 'window_end', j.window_end,
        'cleaner', (select split_part(c.full_name, ' ', 1) from cleaners c where c.id = j.cleaner_id), 'arrived', j.arrived_at is not null, 'ai_status', j.ai_status, 'summary', j.ai_report ->> 'summary', 'validated_by', j.validated_by,
        'redo', j.review_note is not null,
        'tasks_done', (select count(*) from jsonb_array_elements(j.checklist) e where coalesce((e ->> 'done')::boolean, false)), 'tasks', jsonb_array_length(j.checklist),
        'photos', (select count(*) from cleaning_job_photos p where p.job_id = j.id)) o
      from cleaning_jobs j where j.client_id = cid and j.status <> 'annulee' and j.job_date >= today - 30 order by j.job_date limit 120) x), '[]'::jsonb));
end $$;
revoke all on function partner_overview(text) from public;
grant execute on function partner_overview(text) to anon, authenticated;
