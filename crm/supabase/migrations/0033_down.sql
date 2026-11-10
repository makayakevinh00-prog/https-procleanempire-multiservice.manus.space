do $$ begin
  if to_regclass('public.agent_connectors') is not null then
    drop trigger if exists agent_connectors_core_full on agent_connectors;
  end if;
end $$;
drop function if exists agent_connectors_core_full();
