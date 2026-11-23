drop function if exists automation_purge_trail(text), automation_mark_departure(text, uuid), automation_departure_candidates(text), admin_live(), partner_live(text), booking_live(text),
  job_live(cleaning_jobs), cleaner_set_eta(text, uuid, int, text), cleaner_trip_ping(text, double precision, double precision), cleaner_trip(text), cleaner_trip_job(uuid);
drop table if exists cleaner_trail;
alter table cleaning_jobs drop column if exists trip_started_at, drop column if exists eta_minutes, drop column if exists eta_at, drop column if exists eta_updated_at,
  drop column if exists eta_source, drop column if exists depart_reminded_at;
