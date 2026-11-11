drop function if exists agent_request_deletion(text);
drop function if exists agent_profile(text);
drop function if exists agent_report(text);
drop function if exists agent_mission(text, uuid);
drop function if exists agent_day(text, date);
drop function if exists agent_mission_obj(uuid);
alter table staff drop column if exists deletion_requested_at;
