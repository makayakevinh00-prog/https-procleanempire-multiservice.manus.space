drop function if exists cleaner_set_avatar(text, text);
drop function if exists cleaner_avatar(text);
alter table cleaners drop column if exists avatar;
