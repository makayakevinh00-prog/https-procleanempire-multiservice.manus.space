drop trigger if exists cleaning_jobs_linen on cleaning_jobs;
drop function if exists cleaning_jobs_linen_trg();
drop function if exists courier_ping(text, double precision, double precision);
drop function if exists courier_run_update(text, uuid, text);
drop function if exists courier_runs(text);
drop function if exists courier_by_token(text);
drop function if exists linen_backfill();
drop function if exists linen_runs_for_job(uuid);
drop table if exists linen_runs;
drop table if exists linen_couriers;
-- cleaner_my_jobs revient à sa version en rejouant 0051 ; cleaning_job_linen reste (renvoie null sans tournée).
