drop function if exists public.partner_rate_job(text, uuid, int, text);
drop function if exists public.partner_post_message(text, uuid, text);
drop function if exists public.partner_job_thread(text, uuid);
drop function if exists public.cleaner_report_problem(text, uuid, text, text);
drop function if exists public.cleaner_post_message(text, uuid, text);
drop function if exists public.cleaner_job_thread(text, uuid);
drop table if exists public.cleaning_reviews;
drop table if exists public.cleaning_messages;
