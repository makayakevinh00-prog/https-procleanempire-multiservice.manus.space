-- Les e-mails en échec peuvent être « marqués comme traités » : ils quittent l'alerte Urgent, mais restent dans le Journal.
alter table email_log add column if not exists acknowledged boolean not null default false;
update email_log set acknowledged = true where ok = false;
