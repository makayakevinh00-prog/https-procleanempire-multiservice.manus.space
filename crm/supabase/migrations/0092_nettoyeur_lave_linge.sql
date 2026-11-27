-- 0092 — Nettoyeurs : qui peut laver du linge (déclaré dans l'app, visible dans le CRM).
alter table cleaners add column if not exists lave_linge boolean not null default false, add column if not exists lave_linge_note text;

create or replace function cleaner_linen_pref(p_token text) returns json language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_by_token(p_token);
begin return json_build_object('lave_linge', c.lave_linge, 'note', c.lave_linge_note); end $$;

create or replace function cleaner_set_linen(p_token text, p_ok boolean, p_note text) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_by_token(p_token);
begin
  update cleaners set lave_linge = coalesce(p_ok, false), lave_linge_note = left(nullif(trim(coalesce(p_note, '')), ''), 200) where id = c.id;
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_linen_pref(text)', 'cleaner_set_linen(text,boolean,text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
