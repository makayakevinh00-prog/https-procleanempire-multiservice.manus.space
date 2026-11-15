-- Retour arrière de 0060 (les fonctions remplacées reviennent en rejouant 0047 et 0058).
drop function if exists agent_payslip_file(text, uuid);
drop function if exists agent_payslips(text);
drop table if exists payslips;
drop function if exists automation_cleaner_set_siret(text, text, text, boolean);
drop function if exists cleaner_pending(text);
drop function if exists cleaner_pending_by_token(text);
drop function if exists automation_password_result(text, text, boolean);
drop function if exists automation_password_get(text, text);
drop function if exists automation_password_set(text, text, text);
drop table if exists login_passwords;
