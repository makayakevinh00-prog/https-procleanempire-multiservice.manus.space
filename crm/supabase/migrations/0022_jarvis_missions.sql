-- JARVIS : moteur de missions (file persistante, étapes, collaboration, validations humaines, journal, budgets).
-- ÉTAT : écrite et testée en base locale (PGlite). NON APPLIQUÉE sur la production : attend l'autorisation du dirigeant.
-- Dépend de 0021 (jarvis_agents) et de is_owner(). Additive : aucune table existante n'est modifiée. Retour arrière : 0022_down.sql.
--
-- Principes :
--  * La BASE est la machine à états : une mission, une étape ou une validation ne change d'état que par les fonctions ci-dessous.
--  * Rien ne se perd si le serveur s'arrête : une mission « prise » porte un bail (lease) ; passé ce bail, un autre exécuteur la reprend.
--  * Chaque changement écrit un événement dans un journal en ajout seul : c'est CE journal qui anime les locaux. Pas d'événement, pas d'animation.
--  * Les appels à une IA sont comptés et plafonnés par jarvis_budgets. Le plafond par défaut est de 0 : aucune dépense sans votre accord explicite.
--  * Les actions de niveau L3 ne peuvent jamais être approuvées par ce circuit.

create table jarvis_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  instruction text not null check (length(trim(instruction)) > 0),
  source text not null default 'instruction' check (source in ('instruction', 'alerte', 'evenement', 'planification')),
  source_ref text,
  dedupe_key text,
  status text not null default 'recue' check (status in ('recue', 'comprise', 'en_file', 'en_cours', 'attente_precision', 'attente_validation', 'terminee', 'echouee', 'annulee')),
  priority int not null default 5 check (priority between 1 and 9),
  lead_agent text references jarvis_agents(key),
  plan jsonb not null default '[]'::jsonb,
  result jsonb,
  error text,
  attempts int not null default 0,
  max_attempts int not null default 3 check (max_attempts between 1 and 10),
  next_run_at timestamptz not null default now(),
  lease_owner text,
  lease_until timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
-- Une même situation ne crée pas deux missions tant que la première n'est pas finie.
create unique index jarvis_missions_live_dedupe on jarvis_missions (dedupe_key) where dedupe_key is not null and status not in ('terminee', 'echouee', 'annulee');
create index jarvis_missions_queue on jarvis_missions (status, next_run_at, priority);

create table jarvis_mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references jarvis_missions(id) on delete cascade,
  seq int not null check (seq > 0),
  agent_key text not null references jarvis_agents(key),
  kind text not null check (kind in ('comprendre', 'planifier', 'outil', 'collaborer', 'synthetiser', 'valider')),
  label text not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'en_cours', 'faite', 'echouee', 'ignoree')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  attempts int not null default 0,
  model text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_micros bigint not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  unique (mission_id, seq)
);
create index jarvis_steps_agent_live on jarvis_mission_steps (agent_key, status);

-- Journal en ajout seul : source de toute animation et de tout historique.
create table jarvis_mission_events (
  id bigint generated always as identity primary key,
  mission_id uuid references jarvis_missions(id) on delete cascade,
  step_id uuid references jarvis_mission_steps(id) on delete set null,
  agent_key text references jarvis_agents(key),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index jarvis_events_recent on jarvis_mission_events (created_at desc);
create index jarvis_events_mission on jarvis_mission_events (mission_id, id);
create or replace function jarvis_events_append_only() returns trigger language plpgsql as $$
begin raise exception 'JOURNAL_EN_AJOUT_SEUL: le journal des missions ne se modifie pas'; end $$;
create trigger jarvis_mission_events_ro before update on jarvis_mission_events for each row execute function jarvis_events_append_only();
create trigger jarvis_mission_events_nodel before delete on jarvis_mission_events for each row when (pg_trigger_depth() = 0 and current_setting('jarvis.allow_purge', true) is distinct from 'on') execute function jarvis_events_append_only();

-- Messages entre agents : une collaboration réelle = un message en attente entre deux agents sur une mission.
create table jarvis_agent_messages (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references jarvis_missions(id) on delete cascade,
  from_agent text not null references jarvis_agents(key),
  to_agent text not null references jarvis_agents(key),
  kind text not null check (kind in ('demande', 'reponse', 'resultat')),
  body jsonb not null default '{}'::jsonb,
  status text not null default 'en_attente' check (status in ('en_attente', 'traite')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  check (from_agent <> to_agent)
);
create index jarvis_messages_open on jarvis_agent_messages (status, to_agent);

-- Validations humaines. L3 n'est jamais approuvable ici.
create table jarvis_validations (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references jarvis_missions(id) on delete cascade,
  step_id uuid references jarvis_mission_steps(id) on delete set null,
  agent_key text not null references jarvis_agents(key),
  level text not null check (level in ('L2', 'L3')),
  proposal jsonb not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'approuvee', 'refusee')),
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index jarvis_validations_open on jarvis_validations (status, created_at);

-- Appels à une IA : tracés, comptés. Vide tant qu'aucune IA n'est branchée.
create table jarvis_llm_calls (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references jarvis_missions(id) on delete set null,
  step_id uuid references jarvis_mission_steps(id) on delete set null,
  agent_key text references jarvis_agents(key),
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  latency_ms int,
  ok boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);
create index jarvis_llm_day on jarvis_llm_calls (created_at desc);

-- Plafonds de dépense (en millionièmes de dollar par jour). 0 = aucune dépense autorisée : à relever UNIQUEMENT par le dirigeant.
create table jarvis_budgets (
  scope text primary key,   -- 'global' ou 'agent:<clé>'
  daily_micros bigint not null default 0 check (daily_micros >= 0),
  updated_at timestamptz not null default now()
);
insert into jarvis_budgets (scope, daily_micros) values ('global', 0);

do $$ declare t text; begin
  foreach t in array array['jarvis_missions', 'jarvis_mission_steps', 'jarvis_mission_events', 'jarvis_agent_messages', 'jarvis_validations', 'jarvis_llm_calls', 'jarvis_budgets'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

create or replace function jarvis_log(p_mission uuid, p_step uuid, p_agent text, p_type text, p_payload jsonb default '{}'::jsonb) returns void language sql as $$
  insert into jarvis_mission_events (mission_id, step_id, agent_key, type, payload) values (p_mission, p_step, p_agent, p_type, coalesce(p_payload, '{}'::jsonb));
$$;

-- Réception d'une instruction ou d'une situation à traiter.
create or replace function jarvis_enqueue_mission(p_title text, p_instruction text, p_source text default 'instruction', p_source_ref text default null, p_dedupe text default null, p_priority int default 5, p_lead text default null)
returns uuid language plpgsql as $$
declare v uuid;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  if p_dedupe is not null then
    select id into v from jarvis_missions where dedupe_key = p_dedupe and status not in ('terminee', 'echouee', 'annulee');
    if found then return v; end if;
  end if;
  insert into jarvis_missions (title, instruction, source, source_ref, dedupe_key, priority, lead_agent) values (p_title, p_instruction, p_source, p_source_ref, p_dedupe, p_priority, p_lead) returning id into v;
  perform jarvis_log(v, null, p_lead, 'mission.recue', jsonb_build_object('title', p_title, 'source', p_source));
  return v;
end $$;

-- Compréhension : le plan (liste d'étapes attribuées à des agents) est enregistré, la mission passe en file.
create or replace function jarvis_plan_mission(p_mission uuid, p_lead text, p_steps jsonb) returns void language plpgsql as $$
declare s jsonb; n int := 0;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  if not exists (select 1 from jarvis_missions where id = p_mission and status in ('recue', 'attente_precision')) then raise exception 'MISSION_ETAT: la mission n''attend pas de plan'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then raise exception 'PLAN_VIDE: une mission a au moins une étape'; end if;
  delete from jarvis_mission_steps where mission_id = p_mission and status = 'en_attente';
  for s in select * from jsonb_array_elements(p_steps) loop
    n := n + 1;
    insert into jarvis_mission_steps (mission_id, seq, agent_key, kind, label, input) values (p_mission, n, s->>'agent', s->>'kind', s->>'label', coalesce(s->'input', '{}'::jsonb));
  end loop;
  update jarvis_missions set status = 'en_file', lead_agent = p_lead, plan = p_steps, updated_at = now() where id = p_mission;
  perform jarvis_log(p_mission, null, p_lead, 'mission.comprise', jsonb_build_object('etapes', n));
end $$;

-- Question de précision : l'agent ne devine pas, il demande.
create or replace function jarvis_ask_clarification(p_mission uuid, p_agent text, p_question text) returns void language plpgsql as $$
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  update jarvis_missions set status = 'attente_precision', lease_owner = null, lease_until = null, updated_at = now() where id = p_mission and status in ('recue', 'en_cours', 'en_file');
  perform jarvis_log(p_mission, null, p_agent, 'mission.precision', jsonb_build_object('question', p_question));
end $$;

-- Prise de la prochaine mission par un exécuteur. Un bail expiré (exécuteur disparu) permet la reprise.
create or replace function jarvis_claim_next(p_worker text, p_lease_seconds int default 120) returns setof jarvis_missions language plpgsql as $$
declare m jarvis_missions; reprise boolean;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  select * into m from jarvis_missions
    where status in ('en_file', 'en_cours') and next_run_at <= now() and (lease_until is null or lease_until < now())
    order by priority, created_at limit 1 for update skip locked;
  if not found then return; end if;
  reprise := m.lease_owner is not null;
  update jarvis_missions set status = 'en_cours', lease_owner = p_worker, lease_until = now() + make_interval(secs => p_lease_seconds), started_at = coalesce(started_at, now()), updated_at = now() where id = m.id returning * into m;
  if reprise then
    update jarvis_mission_steps set status = 'en_attente' where mission_id = m.id and status = 'en_cours';
    perform jarvis_log(m.id, null, m.lead_agent, 'mission.reprise', jsonb_build_object('worker', p_worker));
  else
    perform jarvis_log(m.id, null, m.lead_agent, 'mission.demarree', jsonb_build_object('worker', p_worker));
  end if;
  return next m;
end $$;

create or replace function jarvis_step_start(p_step uuid, p_worker text) returns void language plpgsql as $$
declare s jarvis_mission_steps;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  select st.* into s from jarvis_mission_steps st join jarvis_missions m on m.id = st.mission_id where st.id = p_step and st.status = 'en_attente' and m.status = 'en_cours' and m.lease_owner = p_worker for update of st;
  if not found then raise exception 'ETAPE_ETAT: étape introuvable, déjà prise, ou mission non détenue par cet exécuteur'; end if;
  update jarvis_mission_steps set status = 'en_cours', started_at = now() where id = p_step;
  perform jarvis_log(s.mission_id, p_step, s.agent_key, 'etape.debut', jsonb_build_object('kind', s.kind, 'label', s.label));
end $$;

create or replace function jarvis_step_finish(p_step uuid, p_output jsonb default '{}'::jsonb, p_model text default null, p_tokens_in int default 0, p_tokens_out int default 0, p_cost_micros bigint default 0) returns text language plpgsql as $$
declare s jarvis_mission_steps; left_n int; v_status text;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  update jarvis_mission_steps set status = 'faite', output = p_output, finished_at = now(), model = p_model, tokens_in = p_tokens_in, tokens_out = p_tokens_out, cost_micros = p_cost_micros where id = p_step and status = 'en_cours' returning * into s;
  if not found then raise exception 'ETAPE_ETAT: seule une étape en cours peut se terminer'; end if;
  perform jarvis_log(s.mission_id, p_step, s.agent_key, 'etape.fin', jsonb_build_object('label', s.label));
  select count(*) into left_n from jarvis_mission_steps where mission_id = s.mission_id and status in ('en_attente', 'en_cours');
  if left_n = 0 then
    update jarvis_missions set status = 'terminee', result = p_output, finished_at = now(), lease_owner = null, lease_until = null, updated_at = now() where id = s.mission_id;
    perform jarvis_log(s.mission_id, null, s.agent_key, 'mission.terminee', '{}'::jsonb);
    v_status := 'terminee';
  else
    update jarvis_missions set updated_at = now(), lease_until = now() + interval '120 seconds' where id = s.mission_id;
    v_status := 'en_cours';
  end if;
  return v_status;
end $$;

-- Échec d'une étape : nouvel essai avec délai croissant ; au-delà du maximum, la mission échoue visiblement.
create or replace function jarvis_step_fail(p_step uuid, p_error text, p_retry_after_seconds int default 30) returns text language plpgsql as $$
declare s jarvis_mission_steps; m jarvis_missions;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  select * into s from jarvis_mission_steps where id = p_step and status = 'en_cours' for update;
  if not found then raise exception 'ETAPE_ETAT: seule une étape en cours peut échouer'; end if;
  update jarvis_missions set attempts = attempts + 1, error = p_error, updated_at = now() where id = s.mission_id returning * into m;
  if m.attempts < m.max_attempts then
    update jarvis_mission_steps set status = 'en_attente', attempts = attempts + 1, error = p_error where id = p_step;
    update jarvis_missions set status = 'en_file', lease_owner = null, lease_until = null, next_run_at = now() + make_interval(secs => p_retry_after_seconds * power(2, m.attempts - 1)::int) where id = m.id;
    perform jarvis_log(m.id, p_step, s.agent_key, 'etape.erreur', jsonb_build_object('error', p_error, 'nouvel_essai', true, 'essai', m.attempts));
    return 'nouvel_essai';
  end if;
  update jarvis_mission_steps set status = 'echouee', attempts = attempts + 1, error = p_error, finished_at = now() where id = p_step;
  update jarvis_missions set status = 'echouee', lease_owner = null, lease_until = null, finished_at = now() where id = m.id;
  perform jarvis_log(m.id, p_step, s.agent_key, 'mission.echec', jsonb_build_object('error', p_error));
  return 'echouee';
end $$;

create or replace function jarvis_send_message(p_mission uuid, p_from text, p_to text, p_kind text, p_body jsonb) returns uuid language plpgsql as $$
declare v uuid;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  if not exists (select 1 from jarvis_missions where id = p_mission and status = 'en_cours') then raise exception 'MISSION_ETAT: pas de message hors mission en cours'; end if;
  insert into jarvis_agent_messages (mission_id, from_agent, to_agent, kind, body) values (p_mission, p_from, p_to, p_kind, coalesce(p_body, '{}'::jsonb)) returning id into v;
  perform jarvis_log(p_mission, null, p_from, 'collab.message', jsonb_build_object('to', p_to, 'kind', p_kind));
  return v;
end $$;
create or replace function jarvis_handle_message(p_id uuid) returns void language plpgsql as $$
declare m jarvis_agent_messages;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  update jarvis_agent_messages set status = 'traite', handled_at = now() where id = p_id and status = 'en_attente' returning * into m;
  if found then perform jarvis_log(m.mission_id, null, m.to_agent, 'collab.traite', jsonb_build_object('from', m.from_agent)); end if;
end $$;

-- Validation humaine.
create or replace function jarvis_request_validation(p_mission uuid, p_step uuid, p_agent text, p_level text, p_proposal jsonb) returns uuid language plpgsql as $$
declare v uuid;
begin
  if not is_owner() and auth.uid() is not null then raise exception 'ACCES_REFUSE'; end if;
  insert into jarvis_validations (mission_id, step_id, agent_key, level, proposal) values (p_mission, p_step, p_agent, p_level, p_proposal) returning id into v;
  update jarvis_mission_steps set status = 'en_attente' where id = p_step and status = 'en_cours';
  update jarvis_missions set status = 'attente_validation', lease_owner = null, lease_until = null, updated_at = now() where id = p_mission;
  perform jarvis_log(p_mission, p_step, p_agent, 'validation.demandee', jsonb_build_object('level', p_level));
  return v;
end $$;
create or replace function jarvis_decide_validation(p_id uuid, p_approve boolean, p_note text default null) returns text language plpgsql as $$
declare v jarvis_validations;
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  select * into v from jarvis_validations where id = p_id and status = 'en_attente' for update;
  if not found then raise exception 'VALIDATION_ETAT: déjà décidée ou introuvable'; end if;
  if p_approve and v.level = 'L3' then raise exception 'NIVEAU_L3: une action de niveau 3 ne peut pas être approuvée par ce circuit'; end if;
  update jarvis_validations set status = case when p_approve then 'approuvee' else 'refusee' end, decision_note = p_note, decided_by = auth.uid(), decided_at = now() where id = p_id;
  if p_approve then
    -- L'approbation ne fait que RELANCER la mission : aucun effet extérieur n'est exécuté ici.
    update jarvis_missions set status = 'en_file', next_run_at = now(), updated_at = now() where id = v.mission_id;
  else
    update jarvis_missions set status = 'annulee', finished_at = now(), error = coalesce(p_note, 'Refusée par le dirigeant'), updated_at = now() where id = v.mission_id;
    update jarvis_mission_steps set status = 'ignoree' where mission_id = v.mission_id and status = 'en_attente';
  end if;
  perform jarvis_log(v.mission_id, v.step_id, v.agent_key, 'validation.decision', jsonb_build_object('approuvee', p_approve));
  return case when p_approve then 'approuvee' else 'refusee' end;
end $$;

create or replace function jarvis_cancel_mission(p_mission uuid, p_reason text default null) returns void language plpgsql as $$
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  update jarvis_missions set status = 'annulee', finished_at = now(), error = p_reason, lease_owner = null, lease_until = null, updated_at = now() where id = p_mission and status not in ('terminee', 'echouee', 'annulee');
  update jarvis_mission_steps set status = 'ignoree' where mission_id = p_mission and status in ('en_attente', 'en_cours');
  perform jarvis_log(p_mission, null, null, 'mission.annulee', jsonb_build_object('raison', p_reason));
end $$;

-- Budget : une dépense d'IA n'est autorisée que si le plafond du jour n'est pas dépassé. Plafond 0 = refus.
create or replace function jarvis_budget_ok(p_agent text, p_micros bigint) returns boolean language sql stable as $$
  select coalesce((select daily_micros from jarvis_budgets where scope = 'global'), 0) > 0
     and coalesce((select sum(cost_micros) from jarvis_llm_calls where created_at >= date_trunc('day', now())), 0) + p_micros <= (select daily_micros from jarvis_budgets where scope = 'global')
     and coalesce((select sum(cost_micros) from jarvis_llm_calls where agent_key = p_agent and created_at >= date_trunc('day', now())), 0) + p_micros <= coalesce((select daily_micros from jarvis_budgets where scope = 'agent:' || p_agent), (select daily_micros from jarvis_budgets where scope = 'global'));
$$;

-- Vue « ce que fait chaque agent MAINTENANT » : seule source des attitudes dans les locaux en mode réel.
create or replace view jarvis_agent_live with (security_invoker = true) as
select a.key as agent_key,
  exists (select 1 from jarvis_mission_steps s join jarvis_missions m on m.id = s.mission_id where s.agent_key = a.key and s.status = 'en_cours' and m.status = 'en_cours' and m.lease_until > now()) as travaille,
  (select count(*) from jarvis_validations v where v.agent_key = a.key and v.status = 'en_attente') as validations_en_attente,
  exists (select 1 from jarvis_missions m join jarvis_mission_steps s on s.mission_id = m.id where s.agent_key = a.key and m.status = 'echouee' and m.finished_at > now() - interval '1 day') as en_difficulte,
  (select count(*) from jarvis_agent_messages g where g.status = 'en_attente' and (g.from_agent = a.key or g.to_agent = a.key)) as collaborations
from jarvis_agents a;
