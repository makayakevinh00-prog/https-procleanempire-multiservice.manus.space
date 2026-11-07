-- Retour arrière de 0025 : retire les colonnes « famille d'activité » (les familles retombent sur la déduction automatique).
alter table contracts drop column if exists activity;
alter table interventions drop column if exists activity;
alter table invoices drop column if exists activity;
alter table quotes drop column if exists activity;
