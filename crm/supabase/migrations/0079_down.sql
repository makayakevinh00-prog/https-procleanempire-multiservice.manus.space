drop function if exists automation_mission_brief(text, uuid);
drop function if exists automation_mission_photos(text, uuid, text);
drop function if exists automation_set_mission_analysis(text, uuid, text, jsonb, text, jsonb, jsonb);
drop function if exists agent_can_analyse(text, uuid);
-- agent_mission_obj et agent_add_photo : rejouer leurs définitions de 0041_agent_app.sql et 0008_agent_mobile.sql.
alter table interventions drop column if exists ai_status, drop column if exists ai_report, drop column if exists before_report;
drop trigger if exists interventions_rotation_t on interventions;
drop function if exists interventions_rotation();
alter table interventions drop column if exists rotation_item;
alter table sites drop column if exists rotation, drop column if exists visit_memory;
