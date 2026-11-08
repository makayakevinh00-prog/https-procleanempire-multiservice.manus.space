-- 0031 — La présence ne dépend plus du contenu de jarvis_agents : sur certaines bases, cette table ne liste pas les 9 agents du plugin
-- (ex. « creative », « developer »). L'agent annoncé est accepté s'il fait partie des 9 clés connues ; sinon, c'est celui du lien.
create or replace function agent_presence_touch(p_token text, p_agent text, p_op text) returns void
language plpgsql security definer set search_path = public as $$
declare own text; who text;
begin
  own := (agent_connector_by_token(p_token)).agent_key;   -- vérifie le lien secret (échec identique pour tout lien invalide ou révoqué)
  who := case when p_agent in ('core','finance','commercial','operations','relation','marketing','studio','rh','juridique') then p_agent else own end;
  insert into agent_presence(agent_key, last_op, calls) values (who, left(coalesce(p_op, ''), 40), 1)
  on conflict (agent_key) do update set last_seen_at = now(), last_op = excluded.last_op, calls = agent_presence.calls + 1;
end $$;
revoke execute on function agent_presence_touch(text, text, text) from public;
grant execute on function agent_presence_touch(text, text, text) to anon, authenticated;
