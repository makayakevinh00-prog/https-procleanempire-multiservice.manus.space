drop function if exists automation_revoke_tokens(text, text[]);
drop function if exists automation_issue_token(text, text, uuid, text);
drop function if exists automation_login_verify(text, text, text);
drop function if exists automation_login_start(text, text, text);
drop function if exists login_roles(text);
drop trigger if exists cleaners_purge_tokens on cleaners;
drop trigger if exists staff_purge_tokens on staff;
do $$ begin
  if to_regclass('public.linen_couriers') is not null then drop trigger if exists couriers_purge_tokens on linen_couriers; end if;
  if to_regclass('public.partner_access') is not null then drop trigger if exists partner_purge_tokens on partner_access; end if;
end $$;
drop function if exists access_tokens_purge_trg();
drop table if exists access_tokens;
drop table if exists login_codes;
-- Les fonctions *_by_token et partner_client reviennent à leur version en rejouant 0044, 0008, 0052 et 0053.
