-- 0010 — Un renvoi de la même demande ne consomme plus de numéro (pas de « trous » dans DEM-AAMM-NNNN).
create or replace function submit_quote_request_v2(p_secret text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid; dup boolean := false; r quote_requests;
begin
  perform automation_guard(p_secret);
  if nullif(p ->> 'reference', '') is not null then
    select id into v from quote_requests where reference = p ->> 'reference';
    if v is not null then dup := true; end if;
  end if;
  if v is null then
    insert into quote_requests(reference, received_at, name, company, email, phone, address, postcode, city, service, start_date, message, details, source)
    values (p ->> 'reference', coalesce((p ->> 'received_at')::timestamptz, now()), coalesce(nullif(p ->> 'name', ''), 'Sans nom'), p ->> 'company',
            p ->> 'email', p ->> 'phone', p ->> 'address', p ->> 'postcode', p ->> 'city', p ->> 'service', p ->> 'start_date',
            p ->> 'message', coalesce(p -> 'details', '{}'::jsonb), p ->> 'source')
    on conflict (reference) do nothing
    returning id into v;
    if v is null then   -- course : une requête identique vient d'être enregistrée
      select id into v from quote_requests where reference = p ->> 'reference';
      dup := true;
    end if;
  end if;
  select * into r from quote_requests where id = v;
  return jsonb_build_object('id', r.id, 'request_number', r.request_number, 'tracking_token', r.tracking_token, 'status', r.status, 'duplicate', dup);
end $$;
revoke all on function submit_quote_request_v2(text, jsonb) from public, anon;
grant execute on function submit_quote_request_v2(text, jsonb) to anon, authenticated;
