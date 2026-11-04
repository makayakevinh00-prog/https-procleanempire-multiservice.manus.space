-- 0007 — Processus reliés : facturation depuis missions validées, séquence d'impayés J+30, devis → contrat.
-- Migration compatible : uniquement des ajouts.
alter table app_settings add column if not exists billing_requires_validation boolean not null default true;
alter table app_settings add column if not exists reminder_manual_days int not null default 30 check (reminder_manual_days > 0);
alter table quotes add column if not exists contract_id uuid references contracts(id) on delete set null;
create index if not exists quotes_contract_idx on quotes (contract_id);
