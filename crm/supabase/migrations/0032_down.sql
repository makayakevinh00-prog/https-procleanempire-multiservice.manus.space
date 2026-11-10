drop function if exists agent_admin_api(text, text, jsonb);
drop function if exists agent_where(text, jsonb, text);
drop function if exists agent_col_ok(text, text);
drop function if exists agent_table_ok(text, boolean);
do $$ begin
  if to_regclass('public.agent_connectors') is not null then
    alter table agent_connectors drop column if exists full_access;
  end if;
end $$;
