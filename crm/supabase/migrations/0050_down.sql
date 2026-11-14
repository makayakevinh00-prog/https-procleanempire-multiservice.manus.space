drop function if exists automation_release_noshows(text);
drop function if exists automation_cleaning_reminders(text);
drop function if exists cleaner_arrive(text, uuid);
drop table if exists cleaning_noshows;
alter table cleaning_jobs drop column if exists validated_by, drop column if exists reminded_hour_at, drop column if exists reminded_eve_at, drop column if exists arrived_at;
alter table marketplace_settings drop column if exists auto_validate;
-- Les fonctions redéfinies (photos, analyse, éligibilité) reviennent à leur version en rejouant 0045 puis 0048.
