drop function if exists automation_stock_save(text, text, uuid, text, jsonb, text, date);
drop function if exists automation_stock_input(text, text, uuid);
drop function if exists stock_add_frame(text, text, uuid, text, text, boolean);
drop function if exists stock_status(text, text, uuid);
drop function if exists stock_scope(text, text, uuid);
drop table if exists stock_frames;
drop table if exists stock_counts;
