-- 0033 — Tout lien de l'assistant principal (agent « core », y compris les nouvelles autorisations OAuth) reçoit l'accès complet dès sa création.
create or replace function agent_connectors_core_full() returns trigger language plpgsql as $$
begin
  if new.agent_key = 'core' then new.full_access := true; end if;
  return new;
end $$;
do $$ begin
  if to_regclass('public.agent_connectors') is not null then
    drop trigger if exists agent_connectors_core_full on agent_connectors;
    create trigger agent_connectors_core_full before insert on agent_connectors for each row execute function agent_connectors_core_full();
    update agent_connectors set full_access = true where agent_key = 'core' and revoked_at is null;
  end if;
end $$;
