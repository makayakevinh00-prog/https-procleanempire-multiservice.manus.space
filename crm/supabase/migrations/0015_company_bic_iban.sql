-- BIC affiché avec l'IBAN sur les factures ; IBAN du compte principal renseigné (il était vide : factures sans RIB).
alter table app_settings add column if not exists company_bic text;
update app_settings set company_iban = 'FR76 1695 8000 0162 8198 8735 439', company_bic = 'QNTOFRP1XXX' where company_iban is null;
