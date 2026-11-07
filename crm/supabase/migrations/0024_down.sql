-- Retour arrière de 0024 : supprime le connecteur des agents (les propositions déjà créées restent dans jarvis_actions).
drop function if exists agent_api(text, text, jsonb);
drop function if exists agent_connector_by_token(text);
drop function if exists jarvis_mark_sent(uuid, text);
drop table if exists agent_connectors;
delete from jarvis_action_kinds where kind = 'send_email' and not exists (select 1 from jarvis_actions where kind = 'send_email');
