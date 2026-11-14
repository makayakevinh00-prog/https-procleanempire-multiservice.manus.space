drop trigger if exists cleaning_jobs_tasks on cleaning_jobs;
drop function if exists cleaning_jobs_tasks_trg();
drop function if exists cleaner_check_task(text, uuid, int, boolean);
drop function if exists cleaner_checklists(text);
drop function if exists cleaning_job_tasks(uuid);
alter table cleaning_jobs drop column if exists checklist;
alter table marketplace_settings drop column if exists default_checklist;
