drop function if exists partner_set_rooms(text, uuid, text[]);
drop function if exists cleaner_job_rooms(text);
drop function if exists cleaning_missing_rooms(uuid);
drop function if exists cleaning_job_rooms(uuid);
alter table cleaning_job_photos drop column if exists room;
alter table cleaning_jobs drop column if exists rooms;
alter table marketplace_settings drop column if exists default_rooms;
do $$ begin if to_regclass('public.concierge_listings') is not null then alter table concierge_listings drop column if exists rooms; end if; end $$;
-- cleaner_add_photo, automation_job_photos, cleaning_rules_reason et le déclencheur des tâches reviennent à leur version en rejouant 0050, 0054 et 0055.
