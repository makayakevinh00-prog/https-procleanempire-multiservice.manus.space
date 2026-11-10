do $$ declare r record; begin
  for r in select polrelid::regclass t, polname from pg_policy where polname like '%\_team\_%' escape '\' loop
    execute format('drop policy if exists %I on %s', r.polname, r.t);
  end loop;
end $$;
drop function if exists team_claim(text);
drop function if exists team_invite(text, text, text, jsonb, text);
drop function if exists team_settings();
drop function if exists my_access();
drop function if exists team_can(text, text);
drop function if exists team_level(text);
drop function if exists is_team_member();
drop function if exists team_member_row();
drop table if exists team_members;
-- next_counter et log_audit retrouvent leur règle d'origine (patron seul)
create or replace function next_counter(p_key text) returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  insert into counters(key, value) values (p_key, 1)
  on conflict (key) do update set value = counters.value + 1
  returning value into v;
  return v;
end $$;
create or replace function log_audit(p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}') returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  insert into audit_log(user_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end $$;
