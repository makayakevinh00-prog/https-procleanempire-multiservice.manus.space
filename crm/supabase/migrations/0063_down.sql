drop function if exists automation_photo_reminder_done(text, uuid, uuid);
drop function if exists automation_photo_reminders(text, date);
drop function if exists agent_mark_app(text, boolean);
drop table if exists agent_photo_reminders;
alter table staff drop column if exists app_installed_at, drop column if exists app_opened_at, drop column if exists employment;
