create or replace function agent_presence_touch(p_token text, p_agent text, p_op text) returns void
language plpgsql security definer set search_path = public as $$
declare own text; who text;
begin
  own := (agent_connector_by_token(p_token)).agent_key;
  who := case when p_agent is not null and exists (select 1 from jarvis_agents where key = p_agent) then p_agent else own end;
  insert into agent_presence(agent_key, last_op, calls) values (who, left(coalesce(p_op, ''), 40), 1)
  on conflict (agent_key) do update set last_seen_at = now(), last_op = excluded.last_op, calls = agent_presence.calls + 1;
end $$;
