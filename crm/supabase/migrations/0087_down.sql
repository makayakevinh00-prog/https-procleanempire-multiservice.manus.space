-- 0087 (retour) : retire la photo, la formation et le rapport mensuel des agents.
drop function if exists agent_set_avatar(text, text), agent_avatar(text), agent_training(text), agent_training_questions(text, text), agent_training_submit(text, text, jsonb), agent_month(text, date);
delete from training_attempts where staff_id is not null;
delete from training_questions where module like 'agent\_%';
alter table training_attempts drop constraint if exists training_attempts_owner_one, drop constraint if exists training_attempts_module_check;
alter table training_attempts drop column if exists staff_id;
alter table training_attempts alter column cleaner_id set not null;
alter table training_attempts add constraint training_attempts_module_check check (module in ('app', 'process', 'incident'));
alter table training_questions drop constraint if exists training_questions_module_check;
alter table training_questions add constraint training_questions_module_check check (module in ('app', 'process', 'incident'));
alter table staff drop column if exists avatar, drop column if exists certified_at, drop column if exists certificate_no, drop column if exists training_score;
