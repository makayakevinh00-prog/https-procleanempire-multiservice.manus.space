-- Retour à la version 0056 de automation_job_photos et cleaning_missing_rooms : rejouer ces deux fonctions depuis 0056_photos_par_piece.sql.
drop function if exists automation_set_job_tasks(text, uuid, jsonb);
