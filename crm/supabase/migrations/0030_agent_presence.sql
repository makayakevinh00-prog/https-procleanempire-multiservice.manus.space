-- 0030 — Présence des agents Cowork : qui a appelé le CRM, et quand. Sert uniquement à l'Open space (jamais de fausse activité : sans appel, pas de présence).
create table if not exists agent_presence (
  agent_key text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_op text,
  calls bigint not null default 0
);
alter table agent_presence enable row level security;
drop policy if exists agent_presence_owner on agent_presence;
create policy agent_presence_owner on agent_presence for select to authenticated using (is_owner());

-- Appelée par le connecteur après chaque appel réussi. Le lien secret est vérifié ici ; l'agent annoncé doit exister, sinon c'est celui du lien.
create or replace function agent_presence_touch(p_token text, p_agent text, p_op text) returns void
language plpgsql security definer set search_path = public as $$
declare own text; who text;
begin
  own := (agent_connector_by_token(p_token)).agent_key;   -- vérifie le lien secret (échec identique pour tout lien invalide ou révoqué)
  who := case when p_agent is not null and exists (select 1 from jarvis_agents where key = p_agent) then p_agent else own end;
  insert into agent_presence(agent_key, last_op, calls) values (who, left(coalesce(p_op, ''), 40), 1)
  on conflict (agent_key) do update set last_seen_at = now(), last_op = excluded.last_op, calls = agent_presence.calls + 1;
end $$;
revoke execute on function agent_presence_touch(text, text, text) from public;
grant execute on function agent_presence_touch(text, text, text) to anon, authenticated;
