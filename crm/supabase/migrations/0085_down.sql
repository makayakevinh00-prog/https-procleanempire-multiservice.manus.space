drop function if exists cleaner_request_payout(text), cleaner_invoices(text), cleaner_invoice(text, uuid);
drop index if exists cleaning_payouts_invoice_uq;
alter table cleaning_payouts drop column if exists invoice_no, drop column if exists requested_by_cleaner, drop column if exists requested_at;
drop sequence if exists payout_invoice_seq;
