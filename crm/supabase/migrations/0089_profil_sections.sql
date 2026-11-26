-- 0089 — « Mes informations » : le téléphone et l'IBAN s'enregistrent chacun de leur côté, sans toucher à l'adresse.
create or replace function cleaner_update_phone(p_token text, p_phone text) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_by_token(p_token);
begin
  update cleaners set phone = left(nullif(trim(coalesce(p_phone, '')), ''), 40) where id = c.id;
end $$;

create or replace function cleaner_update_iban(p_token text, p_iban text) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_by_token(p_token); v text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
begin
  if v = '' or v !~ '^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$' or length(v) > 34 then raise exception 'ARGUMENT: IBAN invalide'; end if;
  update cleaners set iban = v where id = c.id;
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_update_phone(text,text)', 'cleaner_update_iban(text,text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
