-- Retour arrière de 0021_jarvis_core.sql : supprime uniquement les objets JARVIS. Aucune table du CRM n'est touchée.
-- (Sauvegarder d'abord si des alertes, tâches ou décisions doivent être conservées.)
drop function if exists jarvis_decide_action(uuid, text, text);
drop function if exists jarvis_record_run(text, text, jsonb);
drop table if exists jarvis_memory;
drop table if exists jarvis_events;
drop table if exists jarvis_tasks;
drop table if exists jarvis_actions;
drop table if exists jarvis_alerts;
drop table if exists jarvis_runs;
drop table if exists jarvis_memory_keys;
drop table if exists jarvis_action_kinds;
drop table if exists jarvis_agents;
