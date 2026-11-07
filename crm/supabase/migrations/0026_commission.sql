-- 0026 — Gestion locative : tarif en pourcentage (commission sur les revenus de location).
-- Compatible : colonnes facultatives, aucune donnée existante modifiée.
alter table contracts add column if not exists commission_pct numeric(5,2) check (commission_pct is null or (commission_pct > 0 and commission_pct <= 100));
alter table contracts add column if not exists commission_base_ht numeric(12,2) check (commission_base_ht is null or commission_base_ht >= 0);   -- revenus locatifs mensuels estimés (facultatif) : sert à projeter la commission
