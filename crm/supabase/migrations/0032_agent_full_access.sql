-- 0032 — Accès complet de l'assistant (agent « core ») : lire et modifier toutes les données métier du CRM.
-- Additif. Décision du patron : son assistant a la main sur le CRM.
-- Garde-fous conservés :
--  * seuls les liens marqués full_access (colonne ci-dessous) peuvent s'en servir ; les autres agents gardent agent_api() seul ;
--  * jamais accessibles : liens des agents, accès comptables, clients OAuth ; journaux d'audit/modifications/e-mails et compteurs de numérotation en lecture seule ;
--  * toute écriture est tracée dans le journal d'audit (agent, table, action, valeurs) ;
--  * une modification ou suppression exige un filtre et touche 50 lignes au plus (sinon rien n'est fait) ;
--  * les règles de la base (déclencheurs, contraintes, factures émises figées) restent appliquées.
-- L'envoi d'e-mails aux clients reste une PROPOSITION validée par le patron (proposer_email_client).

do $$ begin
  if to_regclass('public.agent_connectors') is not null then
    alter table agent_connectors add column if not exists full_access boolean not null default false;
  end if;
end $$;

create or replace function agent_table_ok(p_table text, p_write boolean) returns boolean language sql stable set search_path = public as $$
  select p_table is not null
    and exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname = p_table)
    and p_table not in ('accountants', 'agent_connectors', 'oauth_clients', 'oauth_codes')
    and (not p_write or p_table not in ('audit_log', 'change_log', 'email_log', 'counters', 'agent_presence'))
$$;

create or replace function agent_col_ok(p_table text, p_col text) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = p_table and column_name = p_col)
$$;

-- Clause WHERE à partir d'un objet de filtres : {"col": valeur} (égal), {"col": null} (vide), {"col": {"ilike":"%x%"}} ou gt/gte/lt/lte/neq.
create or replace function agent_where(p_table text, p_filters jsonb, p_alias text) returns text language plpgsql stable set search_path = public as $$
declare k text; v jsonb; parts text[] := '{}'; o text; ops jsonb := '{"gt":">","gte":">=","lt":"<","lte":"<=","neq":"<>"}';
begin
  if p_filters is null or p_filters = 'null'::jsonb then return ''; end if;
  if jsonb_typeof(p_filters) <> 'object' then raise exception 'ARGUMENT: filters doit être un objet'; end if;
  for k, v in select * from jsonb_each(p_filters) loop
    if not agent_col_ok(p_table, k) then raise exception 'ARGUMENT: colonne inconnue « % » dans %', k, p_table; end if;
    if jsonb_typeof(v) = 'null' then parts := parts || format('%I.%I is null', p_alias, k);
    elsif jsonb_typeof(v) = 'object' then
      if v ? 'ilike' then parts := parts || format('%I.%I::text ilike %L', p_alias, k, v->>'ilike');
      else
        o := (select key from jsonb_each_text(v) limit 1);
        if o is null or not ops ? o then raise exception 'ARGUMENT: opérateur inconnu pour « % » (ilike, gt, gte, lt, lte, neq)', k; end if;
        parts := parts || format('%I.%I %s %L', p_alias, k, ops->>o, v->>o);
      end if;
    elsif jsonb_typeof(v) in ('string', 'number', 'boolean') then parts := parts || format('%I.%I = %L', p_alias, k, v #>> '{}');
    else raise exception 'ARGUMENT: valeur invalide pour « % »', k;
    end if;
  end loop;
  return case when cardinality(parts) = 0 then '' else 'where ' || array_to_string(parts, ' and ') end;
end $$;

create or replace function agent_admin_api(p_token text, p_op text, p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c record; t text := p_args->>'table'; w text; ord text := ''; v jsonb; vals jsonb; act text; n int; k text; cols text; sets text;
  lim int := least(greatest(coalesce((p_args->>'limit')::int, 50), 1), 200); off int := greatest(coalesce((p_args->>'offset')::int, 0), 0);
  v_id uuid;
begin
  c := agent_connector_by_token(p_token);
  if not c.full_access then raise exception 'ACCES_REFUSE: ce lien n''a pas l''accès complet.'; end if;

  if p_op = 'db_schema' then
    return (select coalesce(jsonb_agg(jsonb_build_object('table', cl.relname, 'colonnes', (
        select jsonb_agg(jsonb_build_object('nom', a.column_name, 'type', a.data_type, 'obligatoire', a.is_nullable = 'NO' and a.column_default is null) order by a.ordinal_position)
        from information_schema.columns a where a.table_schema = 'public' and a.table_name = cl.relname), 'ecriture', agent_table_ok(cl.relname, true)) order by cl.relname), '[]'::jsonb)
      from pg_class cl where cl.relnamespace = 'public'::regnamespace and cl.relkind = 'r' and agent_table_ok(cl.relname, false));
  end if;

  if not agent_table_ok(t, p_op = 'db_write') then raise exception 'TABLE_INTERDITE: « % » est inconnue ou protégée.', coalesce(t, ''); end if;

  if p_op = 'db_read' then
    w := agent_where(t, p_args->'filters', 'r');
    if p_args->>'order' is not null then
      if not agent_col_ok(t, p_args->>'order') then raise exception 'ARGUMENT: colonne de tri inconnue'; end if;
      ord := format('order by r.%I %s', p_args->>'order', case when lower(p_args->>'direction') = 'desc' then 'desc' else 'asc' end);
    end if;
    execute format('select count(*) from public.%I r %s', t, w) into n;
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from (select r.* from public.%I r %s %s limit %s offset %s) x', t, w, ord, lim, off) into v;
    return jsonb_build_object('table', t, 'total', n, 'lignes', v);

  elsif p_op = 'db_write' then
    act := p_args->>'action';
    if act not in ('insert', 'update', 'delete') then raise exception 'ARGUMENT: action = insert, update ou delete'; end if;
    vals := p_args->'values';
    if act in ('insert', 'update') then
      if vals is null or jsonb_typeof(vals) <> 'object' or vals = '{}'::jsonb then raise exception 'ARGUMENT: values (objet non vide) requis'; end if;
      for k in select jsonb_object_keys(vals) loop
        if not agent_col_ok(t, k) then raise exception 'ARGUMENT: colonne inconnue « % » dans %', k, t; end if;
      end loop;
      select string_agg(format('%I', key), ', '), string_agg(format('%I = s.%I', key, key), ', ') into cols, sets from jsonb_object_keys(vals) as key;
    end if;
    if act in ('update', 'delete') then
      if p_args->'filters' is null or jsonb_typeof(p_args->'filters') <> 'object' or p_args->'filters' = '{}'::jsonb then raise exception 'ARGUMENT: filters requis pour modifier ou supprimer'; end if;
      w := agent_where(t, p_args->'filters', 'r');
    end if;

    if act = 'insert' then
      execute format('with i as (insert into public.%I as r (%s) select %s from jsonb_populate_record(null::public.%I, %L::jsonb) returning to_jsonb(r) j) select coalesce(jsonb_agg(j), ''[]''::jsonb) from i', t, cols, cols, t, vals::text) into v;
    elsif act = 'update' then
      execute format('with u as (update public.%I as r set %s from jsonb_populate_record(null::public.%I, %L::jsonb) as s %s returning to_jsonb(r) j) select coalesce(jsonb_agg(j), ''[]''::jsonb) from u',
        t, sets, t, vals::text, w) into v;
    else
      execute format('with d as (delete from public.%I as r %s returning to_jsonb(r) j) select coalesce(jsonb_agg(j), ''[]''::jsonb) from d', t, w) into v;
    end if;
    n := jsonb_array_length(v);
    if n > 50 then raise exception 'TROP_DE_LIGNES: % lignes concernées (50 au plus) : affinez les filtres, rien n''a été fait.', n; end if;
    begin v_id := (v->0->>'id')::uuid; exception when others then v_id := gen_random_uuid(); end;
    perform log_audit('agent.ecriture', t, coalesce(v_id, gen_random_uuid()),
      jsonb_build_object('agent', c.agent_key, 'action', act, 'lignes', n, 'valeurs', left(coalesce(vals::text, ''), 2000), 'filtres', p_args->'filters'));
    return jsonb_build_object('table', t, 'action', act, 'lignes', n, 'resultat', v);

  else
    raise exception 'OPERATION_INCONNUE: %', p_op;
  end if;
end $$;
revoke all on function agent_admin_api(text, text, jsonb) from public;
grant execute on function agent_admin_api(text, text, jsonb) to anon, authenticated;
revoke execute on function agent_table_ok(text, boolean), agent_col_ok(text, text), agent_where(text, jsonb, text) from public, anon, authenticated;

-- Les liens actifs de l'assistant principal (« core ») reçoivent l'accès complet ; les autres agents restent limités.
do $$ begin
  if to_regclass('public.agent_connectors') is not null then
    update agent_connectors set full_access = true where agent_key = 'core' and revoked_at is null;
  end if;
end $$;
