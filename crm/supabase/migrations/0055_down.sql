drop function if exists automation_rules_validate(text, uuid);
drop function if exists cleaning_rules_reason(uuid);
update cleaning_jobs set validated_by = 'direction' where validated_by = 'regles';
alter table cleaning_jobs drop constraint if exists cleaning_jobs_validated_by_check;
alter table cleaning_jobs add constraint cleaning_jobs_validated_by_check check (validated_by is null or validated_by in ('ia', 'direction'));
alter table cleaning_jobs drop column if exists check_note;
alter table marketplace_settings drop column if exists spot_check_every, drop column if exists trust_jobs, drop column if exists rules_min_minutes, drop column if exists rules_min_photos, drop column if exists rules_validate;
