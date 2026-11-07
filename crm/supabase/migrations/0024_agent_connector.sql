-- 0024 — Connecteur pour les agents (Claude Cowork) : lecture limitée, tâches, propositions ; jamais d'envoi direct.
-- Compatible : uniquement des ajouts. Dépend de 0021 (registre JARVIS).
-- Sécurité :
--  * Chaque agent a son propre lien secret (empreinte SHA-256 stockée, lien affiché une seule fois), révocable.
--  * L'agent n'a AUCUN accès direct aux tables : il passe par agent_api(), qui vérifie le lien, borne chaque réponse
--    et n'expose ni IBAN, ni téléphone, ni e-mail, ni note interne ; les contacts réservés sont exclus partout.
--  * Un e-mail rédigé par un agent est une PROPOSITION (niveau L2) : il ne part qu'après validation du patron,
--    aux adresses de la fiche client (jamais à une adresse fournie par l'agent).

create table agent_connectors (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references jarvis_agents(key),
  label text,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
alter table agent_connectors enable row level security;
create policy agent_connectors_owner on agent_connectors for all to authenticated using (is_owner()) with check (is_owner());
revoke all on agent_connectors from anon;

insert into jarvis_action_kinds (kind, level, label, description) values
  ('send_email', 'L2', 'Envoyer un e-mail au client', 'E-mail rédigé par un agent : il ne part qu''après votre validation, aux adresses de la fiche client.')
on conflict (kind) do nothing;

-- Le patron marque une proposition d'envoi comme exécutée une fois l'e-mail réellement parti (jamais avant).
create or replace function jarvis_mark_sent(p_id uuid, p_result text) returns void language plpgsql set search_path = public as $$
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  update jarvis_actions set status = 'executed', decided_by = auth.uid(), decided_at = now(), result = p_result
    where id = p_id and status = 'proposed' and kind = 'send_email';
  if not found then raise exception 'ACTION_INTROUVABLE_OU_TRAITEE'; end if;
  perform log_audit('jarvis.envoi', 'jarvis_actions', p_id, jsonb_build_object('result', p_result));
end $$;
revoke execute on function jarvis_mark_sent(uuid, text) from public, anon;

-- Interne : identifie l'agent d'un lien. Même message pour tout échec.
create or replace function agent_connector_by_token(p_token text) returns agent_connectors
language plpgsql security definer set search_path = public as $$
declare c agent_connectors;
begin
  if p_token is null or length(p_token) < 32 then raise exception 'ACCES_REFUSE: lien invalide ou révoqué.'; end if;
  select * into c from agent_connectors where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') and revoked_at is null;
  if not found then raise exception 'ACCES_REFUSE: lien invalide ou révoqué.'; end if;
  if not exists (select 1 from jarvis_agents where key = c.agent_key and enabled) then raise exception 'ACCES_REFUSE: agent désactivé.'; end if;
  update agent_connectors set last_used_at = now() where id = c.id;
  perform set_config('app.actor', 'Agent MCP : ' || c.agent_key, true);
  return c;
end $$;
revoke all on function agent_connector_by_token(text) from public, anon, authenticated;

create or replace function agent_api(p_token text, p_op text, p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c agent_connectors; today date := (now() at time zone 'Europe/Paris')::date;
  lim int := least(greatest(coalesce((p_args->>'limit')::int, 30), 1), 50);
  v jsonb; v_id uuid; v_kind text; v_level text; v_client uuid; v_title text;
begin
  c := agent_connector_by_token(p_token);

  if p_op = 'overview' then
    return jsonb_build_object(
      'date', today,
      'factures_ouvertes', (select jsonb_build_object('nombre', count(*), 'reste_a_encaisser_ttc', coalesce(sum(i.total_ttc - i.paid_amount), 0)) from invoices i join clients cl on cl.id = i.client_id where i.status in ('envoye','en_retard') and not cl.is_reserved),
      'factures_en_retard', (select jsonb_build_object('nombre', count(*), 'montant_ttc', coalesce(sum(i.total_ttc - i.paid_amount), 0)) from invoices i join clients cl on cl.id = i.client_id where i.status = 'en_retard' and not cl.is_reserved),
      'paiements_a_rapprocher', (select count(*) from payments where match_status in ('non_rapproche','propose') and amount > 0),
      'missions_7_jours', (select count(*) from interventions where scheduled_date between today and today + 7 and stage <> 'annulee'),
      'missions_sans_intervenant', (select count(*) from interventions where scheduled_date >= today and stage not in ('annulee','facturee','terminee','validee','facturable') and staff_id is null and assignee is null),
      'demandes_du_site_nouvelles', (select count(*) from quote_requests where status = 'nouvelle'),
      'propositions_en_attente', (select count(*) from jarvis_actions where status = 'proposed'));

  elsif p_op = 'open_invoices' then
    return (select coalesce(jsonb_agg(x order by x->>'echeance'), '[]'::jsonb) from (
      select jsonb_build_object('numero', i.number, 'statut', i.status, 'client', cl.name, 'client_id', cl.id, 'total_ttc', i.total_ttc, 'reste_du_ttc', i.total_ttc - i.paid_amount,
        'emission', i.issue_date, 'echeance', i.due_date, 'jours_de_retard', greatest(today - i.due_date, 0), 'relances', i.reminder_count) x
      from invoices i join clients cl on cl.id = i.client_id
      where i.status in ('envoye','en_retard') and not cl.is_reserved order by i.due_date limit lim) t);

  elsif p_op = 'unmatched_payments' then
    return (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'date', p.received_at::date, 'montant', p.amount, 'payeur', p.counterparty, 'libelle', p.label, 'reference', p.reference) order by p.received_at desc), '[]'::jsonb)
      from (select * from payments where match_status in ('non_rapproche','propose') and amount > 0 order by received_at desc limit lim) p);

  elsif p_op = 'upcoming_missions' then
    return (select coalesce(jsonb_agg(x order by x->>'date', x->>'heure'), '[]'::jsonb) from (
      select jsonb_build_object('id', i.id, 'date', i.scheduled_date, 'heure', i.start_time, 'client', case when cl.is_reserved then 'Contact réservé' else cl.name end, 'site', case when cl.is_reserved then null else s.name end,
        'intervenant', i.assignee, 'etape', i.stage, 'titre', case when cl.is_reserved then null else i.title end) x
      from interventions i join clients cl on cl.id = i.client_id left join sites s on s.id = i.site_id
      where i.scheduled_date between today and today + least(greatest(coalesce((p_args->>'days')::int, 7), 1), 30) and i.stage <> 'annulee' order by i.scheduled_date, i.start_time limit lim) t);

  elsif p_op = 'quote_requests' then
    return (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'recue_le', r.received_at::date, 'nom', r.name, 'societe', r.company, 'ville', r.city, 'prestation', r.service, 'message', left(r.message, 800), 'debut_souhaite', r.start_date) order by r.received_at desc), '[]'::jsonb)
      from (select * from quote_requests where status = 'nouvelle' order by received_at desc limit lim) r);

  elsif p_op = 'find_client' then
    if coalesce(length(btrim(p_args->>'name')), 0) < 2 then raise exception 'ARGUMENT: name (2 caractères minimum)'; end if;
    return (select coalesce(jsonb_agg(jsonb_build_object('id', cl.id, 'nom', cl.name, 'statut', cl.status, 'type', cl.kind, 'ville', cl.city,
        'peut_recevoir_un_email', (cl.email is not null or exists (select 1 from client_emails ce where ce.client_id = cl.id)),
        'factures_ouvertes', (select count(*) from invoices i where i.client_id = cl.id and i.status in ('envoye','en_retard')),
        'reste_du_ttc', (select coalesce(sum(i.total_ttc - i.paid_amount), 0) from invoices i where i.client_id = cl.id and i.status in ('envoye','en_retard')))), '[]'::jsonb)
      from (select * from clients where not is_reserved and name ilike '%' || replace(replace(btrim(p_args->>'name'), '%', ''), '_', '') || '%' order by name limit 10) cl);

  elsif p_op = 'create_task' then
    v_title := left(btrim(coalesce(p_args->>'title', '')), 200);
    if length(v_title) < 3 then raise exception 'ARGUMENT: title requis'; end if;
    insert into jarvis_tasks (agent_key, title, detail, priority, dedupe_key)
      values (c.agent_key, v_title, left(p_args->>'detail', 2000), case when p_args->>'priority' in ('basse','normale','haute') then p_args->>'priority' else 'normale' end, nullif(left(p_args->>'dedupe_key', 120), ''))
      on conflict do nothing returning id into v_id;
    perform log_audit('agent.tache', 'jarvis_tasks', coalesce(v_id, gen_random_uuid()), jsonb_build_object('agent', c.agent_key, 'title', v_title));
    return jsonb_build_object('id', v_id, 'creee', v_id is not null);

  elsif p_op = 'propose_action' then
    v_kind := p_args->>'kind';
    select level into v_level from jarvis_action_kinds where kind = v_kind;
    if v_level is null then raise exception 'ACTION_INCONNUE: %', v_kind; end if;
    if v_level <> 'L2' then raise exception 'ACTION_NON_PROPOSABLE: seules les actions à valider (L2) peuvent être proposées par un agent.'; end if;
    v_title := left(btrim(coalesce(p_args->>'title', '')), 200);
    if length(v_title) < 3 then raise exception 'ARGUMENT: title requis'; end if;
    if length(coalesce(p_args->>'dedupe_key', '')) < 3 then raise exception 'ARGUMENT: dedupe_key requis (évite les doublons)'; end if;
    v := coalesce(p_args->'payload', '{}'::jsonb);
    if v_kind = 'send_email' then
      begin v_client := (v->>'client_id')::uuid; exception when others then raise exception 'ARGUMENT: payload.client_id invalide'; end;
      if not exists (select 1 from clients where id = v_client and not is_reserved) then raise exception 'CLIENT_INTERDIT: client introuvable ou contact réservé.'; end if;
      if coalesce(length(btrim(v->>'subject')), 0) < 3 or length(v->>'subject') > 200 then raise exception 'ARGUMENT: payload.subject (3 à 200 caractères)'; end if;
      if coalesce(length(btrim(v->>'body')), 0) < 10 or length(v->>'body') > 5000 then raise exception 'ARGUMENT: payload.body (10 à 5000 caractères)'; end if;
      v := jsonb_build_object('client_id', v_client, 'subject', btrim(v->>'subject'), 'body', btrim(v->>'body'));   -- seuls ces champs sont conservés : jamais d'adresse fournie par l'agent
    end if;
    if exists (select 1 from jarvis_actions where agent_key = c.agent_key and dedupe_key = p_args->>'dedupe_key' and status in ('proposed','blocked')) then
      return jsonb_build_object('creee', false, 'raison', 'Une proposition identique attend déjà votre validation.');
    end if;
    insert into jarvis_actions (agent_key, kind, level, status, dedupe_key, title, summary, payload, entity_type, entity_id, href)
      values (c.agent_key, v_kind, v_level, 'proposed', p_args->>'dedupe_key', v_title, left(p_args->>'summary', 1000), v, case when v_client is not null then 'client' end, v_client, case when v_client is not null then '/clients/' || v_client end)
      returning id into v_id;
    perform log_audit('agent.proposition', 'jarvis_actions', v_id, jsonb_build_object('agent', c.agent_key, 'kind', v_kind));
    return jsonb_build_object('id', v_id, 'creee', true, 'statut', 'proposed');

  else
    raise exception 'OPERATION_INCONNUE: %', p_op;
  end if;
end $$;
revoke all on function agent_api(text, text, jsonb) from public;
grant execute on function agent_api(text, text, jsonb) to anon, authenticated;
