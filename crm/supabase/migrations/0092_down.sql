drop function if exists cleaner_linen_pref(text), cleaner_set_linen(text, boolean, text);
alter table cleaners drop column if exists lave_linge, drop column if exists lave_linge_note;
