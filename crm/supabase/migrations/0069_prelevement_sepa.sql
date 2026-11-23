-- 0069 — Prélèvement SEPA par Stripe : mandat signé en ligne par le client, prélèvement déclenché facture par facture par le patron.
alter table clients
  add column if not exists stripe_customer_id text,
  add column if not exists sepa_mandate_status text not null default 'aucun' check (sepa_mandate_status in ('aucun', 'en_attente', 'actif', 'revoque')),
  add column if not exists sepa_payment_method_id text,
  add column if not exists sepa_mandate_id text,
  add column if not exists sepa_last4 text,
  add column if not exists sepa_mandate_at timestamptz,
  add column if not exists sepa_mandate_url text,
  add column if not exists sepa_mandate_url_at timestamptz;

alter table invoices
  add column if not exists stripe_payment_intent_id text,
  add column if not exists sepa_status text check (sepa_status in ('en_cours', 'paye', 'rejete', 'conteste')),
  add column if not exists sepa_failure text,
  add column if not exists sepa_requested_at timestamptz;
create unique index if not exists invoices_stripe_pi_idx on invoices (stripe_payment_intent_id) where stripe_payment_intent_id is not null;

-- Un encaissement Stripe est un paiement comme un autre, rapproché de sa facture.
alter table payments drop constraint if exists payments_source_check;
alter table payments add constraint payments_source_check check (source in ('qonto', 'manuel', 'stripe'));
