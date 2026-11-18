-- 0067 — Messagerie interne : le patron et chaque agent s'écrivent dans une conversation par agent.
-- Le patron reçoit les messages en temps réel (Supabase Realtime) ; l'agent, sans session, interroge par son jeton (agent_messages).
create table if not exists team_messages (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  from_owner boolean not null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists team_messages_staff_idx on team_messages (staff_id, created_at);
alter table team_messages enable row level security;
revoke all on team_messages from anon;
drop policy if exists team_messages_owner on team_messages;
create policy team_messages_owner on team_messages for all to authenticated using (is_owner()) with check (is_owner());

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'team_messages') then
    execute 'alter publication supabase_realtime add table team_messages';
  end if;
end $$;

-- L'agent lit sa conversation (les messages de la direction sont alors marqués lus) et écrit à la direction.
create or replace function agent_messages(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a staff := agent_by_token(p_token);
begin
  update team_messages set read_at = now() where staff_id = a.id and from_owner and read_at is null;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'from_owner', from_owner, 'body', body, 'at', created_at) order by created_at)
                     from (select * from team_messages where staff_id = a.id order by created_at desc limit 100) m), '[]'::jsonb);
end $$;
create or replace function agent_send_message(p_token text, p_body text) returns uuid language plpgsql security definer set search_path = public as $$
declare a staff := agent_by_token(p_token); v uuid;
begin
  if length(btrim(coalesce(p_body, ''))) < 1 or length(p_body) > 2000 then raise exception 'ARGUMENT: message vide ou trop long'; end if;
  if (select count(*) from team_messages where staff_id = a.id and not from_owner and created_at > now() - interval '1 minute') >= 20 then raise exception 'ARGUMENT: trop de messages, patientez un instant'; end if;
  insert into team_messages(staff_id, from_owner, body) values (a.id, false, btrim(p_body)) returning id into v;
  return v;
end $$;
create or replace function agent_unread_messages(p_token text) returns int language plpgsql stable security definer set search_path = public as $$
declare a staff := agent_by_token(p_token);
begin
  return (select count(*) from team_messages where staff_id = a.id and from_owner and read_at is null);
end $$;
revoke all on function agent_messages(text), agent_send_message(text, text), agent_unread_messages(text) from public;
grant execute on function agent_messages(text), agent_send_message(text, text), agent_unread_messages(text) to anon, authenticated;
