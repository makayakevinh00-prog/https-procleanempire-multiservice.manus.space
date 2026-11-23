-- job_live revient à sa version 0074 en rejouant 0074_suivi_direct.sql.
drop function if exists automation_claim_start_notice(text, uuid), automation_set_rework(text, uuid, int), automation_set_before_extras(text, uuid, int, jsonb), automation_job_brief(text, uuid);
alter table cleaning_jobs drop column if exists est_minutes, drop column if exists rework_minutes, drop column if exists notified_start_at;
do $$ begin
  if to_regclass('public.concierge_listings') is not null then alter table concierge_listings drop column if exists visit_memory; end if;
end $$;
