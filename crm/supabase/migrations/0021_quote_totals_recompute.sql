-- Recalcul des totaux de devis : correction + rattrapage. ADDITIVE et rejouable. À appliquer seulement sur « go » de Kevinh.
-- Cause : le déclencheur ne recalculait que le devis de la NOUVELLE ligne ; une ligne déplacée vers un autre devis
-- (ou un UPDATE de quote_id) laissait l'ancien devis avec un total périmé. Il recalcule maintenant les deux.

create or replace function recompute_quote_totals() returns trigger language plpgsql security definer set search_path = public as $$
declare q uuid;
begin
  for q in select distinct x from unnest(array[
      case when tg_op in ('INSERT','UPDATE') then new.quote_id end,
      case when tg_op in ('UPDATE','DELETE') then old.quote_id end
    ]) as x where x is not null
  loop
    update quotes set
      total_ht  = coalesce((select sum(round(quantity * unit_price_ht, 2)) from quote_lines where quote_id = q), 0),
      total_vat = coalesce((select sum(round(quantity * unit_price_ht * vat_rate / 100, 2)) from quote_lines where quote_id = q), 0)
    where id = q;
    update quotes set total_ttc = total_ht + total_vat where id = q;
  end loop;
  return null;
end $$;

-- Rattrapage : réaligne les devis dont le total ne correspond plus à leurs lignes (devis sans ligne → 0).
update quotes q set
  total_ht  = coalesce(l.ht, 0),
  total_vat = coalesce(l.vat, 0),
  total_ttc = coalesce(l.ht, 0) + coalesce(l.vat, 0)
from (
  select qq.id,
    (select sum(round(quantity * unit_price_ht, 2)) from quote_lines where quote_id = qq.id) as ht,
    (select sum(round(quantity * unit_price_ht * vat_rate / 100, 2)) from quote_lines where quote_id = qq.id) as vat
  from quotes qq
) l
where l.id = q.id
  and (q.total_ht, q.total_vat, q.total_ttc) is distinct from (coalesce(l.ht, 0), coalesce(l.vat, 0), coalesce(l.ht, 0) + coalesce(l.vat, 0));
