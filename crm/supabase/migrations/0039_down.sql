do $$ begin
  if to_regnamespace('storage') is not null then
    drop policy if exists justificatifs_read on storage.objects;
    drop policy if exists justificatifs_insert on storage.objects;
    drop policy if exists justificatifs_update on storage.objects;
    drop policy if exists justificatifs_delete on storage.objects;
  end if;
end $$;
drop function if exists compta_document_path(uuid);
drop function if exists compta_invoice(text);
do $$ begin
  if to_regclass('public.supplier_payments') is not null then
    alter table supplier_payments drop column if exists document_path;
  end if;
end $$;
