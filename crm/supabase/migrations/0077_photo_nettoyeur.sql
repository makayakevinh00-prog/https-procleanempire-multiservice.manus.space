-- 0077 — Photo de profil du nettoyeur (petite image JPEG réduite par le téléphone, 150 Ko au plus).
alter table cleaners add column if not exists avatar bytea;

create or replace function cleaner_set_avatar(p_token text, p_b64 text) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; d bytea;
begin
  c := cleaner_by_token(p_token);
  if p_b64 is null or p_b64 = '' then update cleaners set avatar = null where id = c.id; return; end if;
  d := decode(p_b64, 'base64');
  if length(d) > 150000 then raise exception 'PHOTO_TROP_LOURDE'; end if;
  if substring(d from 1 for 3) <> '\xffd8ff'::bytea then raise exception 'PHOTO_FORMAT'; end if;
  update cleaners set avatar = d where id = c.id;
end $$;

create or replace function cleaner_avatar(p_token text) returns text language plpgsql stable security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  return (select replace(encode(avatar, 'base64'), E'\n', '') from cleaners where id = c.id and avatar is not null);
end $$;

revoke all on function cleaner_set_avatar(text, text), cleaner_avatar(text) from public;
grant execute on function cleaner_set_avatar(text, text), cleaner_avatar(text) to anon, authenticated;
