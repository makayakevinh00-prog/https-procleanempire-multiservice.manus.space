alter table contracts drop column if exists signed_note;
alter table contracts drop column if exists signed_on;
drop function if exists automation_inbound_email(text, jsonb);
drop table if exists inbound_emails;
