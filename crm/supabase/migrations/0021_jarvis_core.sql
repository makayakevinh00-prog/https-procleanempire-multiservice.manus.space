-- JARVIS Core : socle commun des agents (registre, alertes, tâches, propositions à valider, mémoire maîtrisée, événements, journal).
-- ÉTAT : écrite et testée en base locale (PGlite). NON APPLIQUÉE sur la production : attend l'autorisation du dirigeant.
-- Retour arrière : 0021_down.sql. Aucune table existante n'est modifiée ni supprimée.
--
-- Principes :
--  * Tout est réservé au patron (is_owner()) : un agent n'a AUCUN pouvoir propre, il écrit ici via la session du patron
--    (ou, plus tard, via une fonction protégée par secret, comme les automatisations existantes).
--  * Le niveau d'autonomie d'une action est fixé PAR LA BASE (table jarvis_action_kinds), jamais par l'agent qui la propose.
--  * Un type d'action inconnu est refusé : on ne peut pas inventer une action « automatique ».
--  * La mémoire commune n'accepte que des clés déclarées (jarvis_memory_keys), avec l'agent autorisé à les écrire et leur durée de vie.

create table jarvis_agents (
  key text primary key,
  name text not null,
  department text not null,
  status text not null default 'prevu' check (status in ('actif', 'prevu')),  -- « actif » = réellement construit et testé
  enabled boolean not null default true,                                       -- interrupteur du patron
  max_level text not null default 'L1' check (max_level in ('L1', 'L2', 'L3')),
  last_run_at timestamptz,
  updated_at timestamptz not null default now()
);

create table jarvis_action_kinds (
  kind text primary key,
  level text not null check (level in ('L1', 'L2', 'L3')),
  label text not null,
  description text not null
);

create table jarvis_memory_keys (
  key text primary key,                                   -- ex. client.delai_paiement_moyen_jours
  scope text not null check (scope in ('shared', 'agent')),
  writers text[] not null,                                 -- agents autorisés à écrire
  description text not null,
  retention_days int not null check (retention_days > 0)   -- durée de vie : effacée au passage suivant d'un agent
);

create table jarvis_runs (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references jarvis_agents(key),
  trigger text not null default 'manuel' check (trigger in ('manuel', 'planifie', 'evenement')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean not null default true,
  summary text,
  stats jsonb not null default '{}'::jsonb,
  error text
);
create index jarvis_runs_agent on jarvis_runs (agent_key, started_at desc);

create table jarvis_alerts (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references jarvis_agents(key),
  dedupe_key text not null,
  severity text not null check (severity in ('info', 'attention', 'urgent')),
  title text not null,
  detail text,
  entity_type text,
  entity_id uuid,
  href text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_reason text
);
-- Une seule alerte « vivante » par situation : pas de doublon d'un passage à l'autre.
create unique index jarvis_alerts_live on jarvis_alerts (agent_key, dedupe_key) where status <> 'resolved';
create index jarvis_alerts_status on jarvis_alerts (status, severity);

create table jarvis_actions (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references jarvis_agents(key),
  kind text not null references jarvis_action_kinds(kind),
  level text not null check (level in ('L1', 'L2', 'L3')),                 -- copié depuis jarvis_action_kinds
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'executed', 'blocked', 'withdrawn')),
  dedupe_key text not null,
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  entity_type text,
  entity_id uuid,
  href text,
  run_id uuid references jarvis_runs(id),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  result text,
  created_at timestamptz not null default now()
);
create unique index jarvis_actions_live on jarvis_actions (agent_key, dedupe_key) where status in ('proposed', 'blocked');
create index jarvis_actions_status on jarvis_actions (status, level);

create table jarvis_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references jarvis_agents(key),
  title text not null,
  detail text,
  status text not null default 'todo' check (status in ('todo', 'done', 'cancelled')),
  priority text not null default 'normale' check (priority in ('basse', 'normale', 'haute')),
  dedupe_key text,
  entity_type text,
  entity_id uuid,
  href text,
  source_action_id uuid references jarvis_actions(id),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create unique index jarvis_tasks_live on jarvis_tasks (agent_key, dedupe_key) where status = 'todo' and dedupe_key is not null;

create table jarvis_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  source_agent text not null references jarvis_agents(key),
  target_agent text not null references jarvis_agents(key),
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'handled')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create unique index jarvis_events_live on jarvis_events (type, target_agent, dedupe_key) where status = 'pending';

-- Instructions données par le patron à un agent. Une « commande » est structurée et exécutable (ex. lancer un passage) ;
-- un texte « libre » est conservé tel quel, en attente : aucun agent n'interprète encore le langage libre (aucune IA connectée).
create table jarvis_instructions (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references jarvis_agents(key),
  kind text not null check (kind in ('commande', 'libre')),
  command text check (command in ('run')),
  body text,
  status text not null default 'en_attente' check (status in ('en_attente', 'executee', 'refusee')),
  result text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  constraint jarvis_instruction_shape check ((kind = 'commande' and command is not null) or (kind = 'libre' and body is not null and length(btrim(body)) > 0))
);
create index jarvis_instructions_agent on jarvis_instructions (agent_key, status, created_at desc);

create table jarvis_memory (
  id uuid primary key default gen_random_uuid(),
  key text not null references jarvis_memory_keys(key),
  agent_key text,                                          -- renseigné pour la mémoire propre à un agent
  subject_type text not null,                              -- ex. client
  subject_id uuid not null,
  value jsonb not null,
  source text not null,                                    -- qui a écrit et lors de quel passage (traçabilité)
  updated_at timestamptz not null default now()
);
create unique index jarvis_memory_one on jarvis_memory (key, coalesce(agent_key, ''), subject_type, subject_id);

-- ── Accès : patron seulement, aucun droit inutile ──────────────────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['jarvis_agents', 'jarvis_action_kinds', 'jarvis_memory_keys', 'jarvis_runs', 'jarvis_alerts', 'jarvis_actions', 'jarvis_tasks', 'jarvis_events', 'jarvis_instructions', 'jarvis_memory'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
    execute format('revoke all on %I from anon', t);
    execute format('revoke truncate, trigger, references on %I from authenticated', t);
  end loop;
end $$;

-- Les règles d'autonomie et la liste des clés de mémoire sont de la configuration : le patron les LIT, ne les modifie pas ici.
drop policy jarvis_action_kinds_owner on jarvis_action_kinds;
create policy jarvis_action_kinds_read on jarvis_action_kinds for select to authenticated using (is_owner());
drop policy jarvis_memory_keys_owner on jarvis_memory_keys;
create policy jarvis_memory_keys_read on jarvis_memory_keys for select to authenticated using (is_owner());
revoke insert, update, delete on jarvis_action_kinds, jarvis_memory_keys from authenticated;

-- Traçabilité : les écritures sont journalisées dans change_log comme le reste du CRM.
do $$ declare t text; begin
  foreach t in array array['jarvis_actions', 'jarvis_tasks', 'jarvis_instructions'] loop
    execute format('create trigger %I after insert or update or delete on %I for each row execute function audit_row()', t || '_audit', t);
  end loop;
end $$;

-- ── Registre : 9 entités. Seul « finance » est réellement construit à ce stade. ─────────────────
insert into jarvis_agents (key, name, department, status, max_level) values
  ('core',       'JARVIS Core',                 'Direction',  'actif', 'L1'),
  ('finance',    'Finance & Administration',    'Département 1', 'actif', 'L1'),
  ('commercial', 'Commercial & Développement',  'Département 2', 'prevu', 'L1'),
  ('operations', 'Opérations & Exploitation',   'Département 3', 'prevu', 'L1'),
  ('relation',   'Relation client',             'Département 4', 'prevu', 'L1'),
  ('marketing',  'Marketing & Communication',   'Département 5', 'prevu', 'L1'),
  ('studio',     'Creative Studio',             'Département 6', 'prevu', 'L1'),
  ('rh',         'RH & Prestataires',           'Département 7', 'prevu', 'L1'),
  ('juridique',  'Juridique & Conformité',      'Département 8', 'prevu', 'L1');

-- Niveaux d'autonomie (référence unique). L1 : exécuté sans validation ; L2 : le patron valide ; L3 : bloqué, autorisation explicite hors de ce circuit.
insert into jarvis_action_kinds (kind, level, label, description) values
  ('create_task',        'L1', 'Créer une tâche',                 'Ajoute une tâche à la liste du patron. Aucun effet extérieur.'),
  ('contact_client',     'L2', 'Proposer un message au client',   'Prépare un message : rien n''est envoyé tant que le patron n''a pas validé, et l''envoi reste manuel dans cette version.'),
  ('change_terms',       'L2', 'Proposer un changement de conditions', 'Modification de délais ou de conditions commerciales : validation obligatoire.'),
  ('legal_notice',       'L3', 'Mise en demeure',                 'Acte juridique engageant l''entreprise : jamais exécuté par JARVIS, autorisation explicite obligatoire.'),
  ('issue_credit_note',  'L3', 'Émettre un avoir',                'Document comptable légal : jamais exécuté par JARVIS, autorisation explicite obligatoire.');

-- Mémoire commune maîtrisée : seules ces clés existent, chacune avec son rédacteur et sa durée de vie.
insert into jarvis_memory_keys (key, scope, writers, description, retention_days) values
  ('client.delai_paiement_moyen_jours', 'shared', array['finance'],
   'Retard moyen de paiement du client, en jours après l''échéance (négatif = paie en avance). Calculé sur ses factures payées.', 365);

-- ── Enregistrer le résultat d'un passage d'agent (une seule transaction) ───────────────────────
-- p_result = {
--   "summary": "...", "stats": {...},
--   "alerts":   [{dedupe_key, severity, title, detail, entity_type, entity_id, href}],
--   "actions":  [{dedupe_key, kind, title, summary, payload, entity_type, entity_id, href}],
--   "tasks":    [{dedupe_key, title, detail, priority, entity_type, entity_id, href}],
--   "events":   [{type, target_agent, dedupe_key, payload}],
--   "memory":   [{key, subject_type, subject_id, value}]
-- }
-- SECURITY INVOKER : la RLS s'applique, donc seul le patron peut l'exécuter avec succès.
create or replace function jarvis_record_run(p_agent text, p_trigger text, p_result jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare
  v_run uuid;
  a record; x record;
  n_alerts_new int := 0; n_alerts_resolved int := 0; n_actions_new int := 0; n_actions_withdrawn int := 0;
  n_tasks_new int := 0; n_events_new int := 0; n_memory int := 0; n_memory_expired int := 0;
  v_level text; v_status text; v_rows int;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  if not exists (select 1 from jarvis_agents where key = p_agent) then raise exception 'AGENT_INCONNU: %', p_agent; end if;
  if not (select enabled from jarvis_agents where key = p_agent) then raise exception 'AGENT_DESACTIVE: %', p_agent; end if;

  insert into jarvis_runs (agent_key, trigger, summary, stats) values (p_agent, coalesce(p_trigger, 'manuel'), p_result->>'summary', coalesce(p_result->'stats', '{}'::jsonb))
  returning id into v_run;

  -- Alertes : créer ou rafraîchir ; ce qui n'est plus constaté est résolu (jamais supprimé).
  for a in select * from jsonb_to_recordset(coalesce(p_result->'alerts', '[]'::jsonb))
      as t(dedupe_key text, severity text, title text, detail text, entity_type text, entity_id uuid, href text) loop
    update jarvis_alerts set severity = a.severity, title = a.title, detail = a.detail, href = a.href, last_seen_at = now()
      where agent_key = p_agent and dedupe_key = a.dedupe_key and status <> 'resolved';
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      insert into jarvis_alerts (agent_key, dedupe_key, severity, title, detail, entity_type, entity_id, href)
      values (p_agent, a.dedupe_key, a.severity, a.title, a.detail, a.entity_type, a.entity_id, a.href);
      n_alerts_new := n_alerts_new + 1;
    end if;
  end loop;
  update jarvis_alerts set status = 'resolved', resolved_at = now(), resolved_reason = 'Plus constaté lors du passage du ' || to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI')
    where agent_key = p_agent and status <> 'resolved'
      and dedupe_key not in (select value->>'dedupe_key' from jsonb_array_elements(coalesce(p_result->'alerts', '[]'::jsonb)));
  get diagnostics n_alerts_resolved = row_count;

  -- Propositions : le niveau vient de la base. Inconnu = refusé. L3 = « bloquée » d'emblée.
  for a in select * from jsonb_to_recordset(coalesce(p_result->'actions', '[]'::jsonb))
      as t(dedupe_key text, kind text, title text, summary text, payload jsonb, entity_type text, entity_id uuid, href text) loop
    select level into v_level from jarvis_action_kinds where kind = a.kind;
    if v_level is null then raise exception 'ACTION_INCONNUE: % (aucune règle d''autonomie définie)', a.kind; end if;
    v_status := case v_level when 'L3' then 'blocked' else 'proposed' end;
    if v_level = 'L1' then
      -- Une action L1 n'a pas besoin de validation : elle passe par la liste « tasks », pas par les propositions.
      raise exception 'ACTION_L1: % est une action automatique, à déclarer dans « tasks »', a.kind;
    end if;
    if not exists (select 1 from jarvis_actions where agent_key = p_agent and dedupe_key = a.dedupe_key and status in ('proposed', 'blocked')) then
      insert into jarvis_actions (agent_key, kind, level, status, dedupe_key, title, summary, payload, entity_type, entity_id, href, run_id)
      values (p_agent, a.kind, v_level, v_status, a.dedupe_key, a.title, a.summary, coalesce(a.payload, '{}'::jsonb), a.entity_type, a.entity_id, a.href, v_run);
      n_actions_new := n_actions_new + 1;
    end if;
  end loop;
  -- Une proposition qui ne se justifie plus est retirée (pas supprimée : l'historique reste).
  update jarvis_actions set status = 'withdrawn', decision_note = 'Retirée : la situation n''est plus constatée.', decided_at = now()
    where agent_key = p_agent and status in ('proposed', 'blocked')
      and dedupe_key not in (select value->>'dedupe_key' from jsonb_array_elements(coalesce(p_result->'actions', '[]'::jsonb)));
  get diagnostics n_actions_withdrawn = row_count;

  -- Tâches L1 : créées directement, sans doublon tant qu'une même tâche est ouverte.
  for a in select * from jsonb_to_recordset(coalesce(p_result->'tasks', '[]'::jsonb))
      as t(dedupe_key text, title text, detail text, priority text, entity_type text, entity_id uuid, href text) loop
    if not exists (select 1 from jarvis_tasks where agent_key = p_agent and dedupe_key = a.dedupe_key and status = 'todo') then
      insert into jarvis_tasks (agent_key, title, detail, priority, dedupe_key, entity_type, entity_id, href)
      values (p_agent, a.title, a.detail, coalesce(a.priority, 'normale'), a.dedupe_key, a.entity_type, a.entity_id, a.href);
      n_tasks_new := n_tasks_new + 1;
    end if;
  end loop;

  -- Événements vers d'autres agents : la cible doit exister ; pas de doublon tant que non traité.
  for a in select * from jsonb_to_recordset(coalesce(p_result->'events', '[]'::jsonb))
      as t(type text, target_agent text, dedupe_key text, payload jsonb) loop
    if not exists (select 1 from jarvis_agents where key = a.target_agent) then raise exception 'DESTINATAIRE_INCONNU: %', a.target_agent; end if;
    if not exists (select 1 from jarvis_events where type = a.type and target_agent = a.target_agent and dedupe_key = a.dedupe_key and status = 'pending') then
      insert into jarvis_events (type, source_agent, target_agent, dedupe_key, payload) values (a.type, p_agent, a.target_agent, a.dedupe_key, coalesce(a.payload, '{}'::jsonb));
      n_events_new := n_events_new + 1;
    end if;
  end loop;

  -- Mémoire : clés déclarées uniquement, et seulement par leurs rédacteurs autorisés.
  for x in select * from jsonb_to_recordset(coalesce(p_result->'memory', '[]'::jsonb)) as t(key text, subject_type text, subject_id uuid, value jsonb) loop
    if not exists (select 1 from jarvis_memory_keys k where k.key = x.key and p_agent = any (k.writers)) then
      raise exception 'MEMOIRE_REFUSEE: l''agent % n''a pas le droit d''écrire la clé %', p_agent, x.key;
    end if;
    insert into jarvis_memory (key, agent_key, subject_type, subject_id, value, source)
    values (x.key, case when (select scope from jarvis_memory_keys where key = x.key) = 'agent' then p_agent end, x.subject_type, x.subject_id, x.value, p_agent || ' · passage ' || v_run::text)
    on conflict (key, (coalesce(agent_key, '')), subject_type, subject_id)
    do update set value = excluded.value, source = excluded.source, updated_at = now();
    n_memory := n_memory + 1;
  end loop;

  -- Durée de vie de la mémoire : ce qui dépasse la rétention de sa clé est effacé.
  delete from jarvis_memory m using jarvis_memory_keys k where m.key = k.key and m.updated_at < now() - make_interval(days => k.retention_days);
  get diagnostics n_memory_expired = row_count;

  update jarvis_runs set finished_at = now() where id = v_run;
  update jarvis_agents set last_run_at = now() where key = p_agent;

  return jsonb_build_object('run_id', v_run, 'alerts_new', n_alerts_new, 'alerts_resolved', n_alerts_resolved,
    'actions_new', n_actions_new, 'actions_withdrawn', n_actions_withdrawn, 'tasks_new', n_tasks_new, 'events_new', n_events_new, 'memory_written', n_memory, 'memory_expired', n_memory_expired);
end $$;

-- ── Décision du patron sur une proposition ─────────────────────────────────────────────────────
-- Approuver une proposition L2 = créer une tâche « à faire » : AUCUN effet extérieur (rien n'est envoyé, modifié ni émis).
-- Une proposition L3 ne peut pas être approuvée par ce circuit : elle exige une autorisation explicite, hors JARVIS.
create or replace function jarvis_decide_action(p_id uuid, p_decision text, p_note text default null)
returns jsonb language plpgsql set search_path = public as $$
declare a jarvis_actions; v_task uuid;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'DECISION_INVALIDE'; end if;
  select * into a from jarvis_actions where id = p_id for update;
  if not found then raise exception 'ACTION_INTROUVABLE'; end if;
  if a.status <> 'proposed' then
    if a.status = 'blocked' then raise exception 'ACTION_BLOQUEE: niveau L3, autorisation explicite requise en dehors de JARVIS.'; end if;
    raise exception 'ACTION_DEJA_TRAITEE: statut %', a.status;
  end if;
  if a.level = 'L3' then raise exception 'ACTION_BLOQUEE: niveau L3, autorisation explicite requise en dehors de JARVIS.'; end if;

  if p_decision = 'reject' then
    update jarvis_actions set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = p_id;
    perform log_audit('jarvis.refus', 'jarvis_actions', p_id, jsonb_build_object('kind', a.kind, 'agent', a.agent_key, 'note', p_note));
    return jsonb_build_object('status', 'rejected');
  end if;

  insert into jarvis_tasks (agent_key, title, detail, priority, dedupe_key, entity_type, entity_id, href, source_action_id)
  values (a.agent_key, 'À faire : ' || a.title, coalesce(a.summary, '') || case when a.payload ? 'brouillon' then E'\n\nBrouillon validé :\n' || (a.payload->>'brouillon') else '' end,
          'haute', 'action:' || a.id::text, a.entity_type, a.entity_id, a.href, a.id)
  returning id into v_task;
  update jarvis_actions set status = 'executed', decided_by = auth.uid(), decided_at = now(), decision_note = p_note,
    result = 'Tâche créée dans la liste du patron. Aucun envoi ni modification automatique.' where id = p_id;
  perform log_audit('jarvis.validation', 'jarvis_actions', p_id, jsonb_build_object('kind', a.kind, 'agent', a.agent_key, 'note', p_note, 'task', v_task));
  return jsonb_build_object('status', 'executed', 'task_id', v_task);
end $$;

revoke execute on function jarvis_record_run(text, text, jsonb), jarvis_decide_action(uuid, text, text) from public, anon;
