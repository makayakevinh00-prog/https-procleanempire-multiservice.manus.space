-- À exécuter UNIQUEMENT sur une base de TEST, juste après les migrations.
-- Pourquoi : certaines migrations (0002, 0015, 0017, 0018, 0020) embarquent des données réelles de l'entreprise
-- (fournisseurs, paiements Qonto, coordonnées de la société, IBAN/BIC). Une base de test ne doit jamais les contenir.
-- Vérification ensuite : supabase/scripts/verify-test-db-clean.sql doit ne renvoyer AUCUNE ligne.
delete from supplier_payments;
delete from suppliers;
delete from payments;
update app_settings set
  company_iban = null, company_bic = null, company_siret = null, company_phone = null, company_address = null,
  company_rcs = null, company_vat_number = null,
  company_email = 'contact@example.invalid', notify_email = 'notify@example.invalid';
