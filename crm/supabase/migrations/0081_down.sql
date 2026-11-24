drop function if exists agent_trip_eta(text, uuid, int, text);
drop function if exists agent_trip_ping(text, uuid, double precision, double precision);
drop function if exists mission_live(interventions);
drop table if exists mission_trips;
-- job_live, partner_live, admin_live et automation_purge_trail : rejouer 0074 puis 0075 pour retrouver leur version précédente.
