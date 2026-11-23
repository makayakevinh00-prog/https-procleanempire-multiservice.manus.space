alter table payments drop constraint if exists payments_source_check;
alter table payments add constraint payments_source_check check (source in ('qonto', 'manuel'));
drop index if exists invoices_stripe_pi_idx;
alter table invoices drop column if exists stripe_payment_intent_id, drop column if exists sepa_status, drop column if exists sepa_failure, drop column if exists sepa_requested_at;
alter table clients drop column if exists stripe_customer_id, drop column if exists sepa_mandate_status, drop column if exists sepa_payment_method_id, drop column if exists sepa_mandate_id,
  drop column if exists sepa_last4, drop column if exists sepa_mandate_at, drop column if exists sepa_mandate_url, drop column if exists sepa_mandate_url_at;
