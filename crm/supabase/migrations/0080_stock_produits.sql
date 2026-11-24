-- 0080 — Stock de produits compté par l'IA : en fin de ménage, l'agent ou le nettoyeur filme ses produits ; l'IA compte ce qui reste,
-- dit quoi racheter et dans combien de temps. Le stock est celui du site (agent ProClean) ou celui du nettoyeur indépendant.
create table if not exists stock_counts (
  id uuid primary key default gen_random_uuid(),
  scope_kind text not null check (scope_kind in ('site', 'staff', 'cleaner')),
  scope_id uuid not null,
  counted_at timestamptz not null default now(),
  counted_by text,
  items jsonb not null default '[]'::jsonb,
  summary text,
  next_due date
);
create index if not exists stock_counts_scope_idx on stock_counts (scope_kind, scope_id, counted_at desc);
-- Images du film de stock : gardées le temps de l'analyse, puis effacées.
create table if not exists stock_frames (
  id uuid primary key default gen_random_uuid(),
  scope_kind text not null, scope_id uuid not null,
  content_type text not null, data bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists stock_frames_scope_idx on stock_frames (scope_kind, scope_id, created_at);
alter table stock_counts enable row level security;
alter table stock_frames enable row level security;
drop policy if exists stock_counts_owner on stock_counts;
create policy stock_counts_owner on stock_counts for all to authenticated using (is_owner()) with check (is_owner());

-- À qui est le stock : le site de la mission d'un agent (à défaut l'agent lui-même), ou le nettoyeur indépendant. Vérifie le lien privé.
create or replace function stock_scope(p_space text, p_token text, p_ref uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff; c cleaners; sid uuid;
begin
  if p_space = 'agent' then
    a := agent_by_token(p_token);
    select i.site_id into sid from interventions i where i.id = p_ref and i.staff_id = a.id;
    if not found then raise exception 'INTROUVABLE: mission introuvable'; end if;
    return case when sid is not null then jsonb_build_object('kind', 'site', 'id', sid, 'by', a.full_name) else jsonb_build_object('kind', 'staff', 'id', a.id, 'by', a.full_name) end;
  elsif p_space = 'nettoyeur' then
    c := cleaner_by_token(p_token);
    return jsonb_build_object('kind', 'cleaner', 'id', c.id, 'by', c.full_name);
  end if;
  raise exception 'ARGUMENT: espace inconnu';
end $$;
revoke all on function stock_scope(text, text, uuid) from public, anon, authenticated;

-- Où en est le stock : dernier comptage, et s'il est temps de recompter (jamais compté, ou date prévue atteinte).
create or replace function stock_status(p_space text, p_token text, p_ref uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s jsonb; last stock_counts;
begin
  s := stock_scope(p_space, p_token, p_ref);
  select * into last from stock_counts where scope_kind = s ->> 'kind' and scope_id = (s ->> 'id')::uuid order by counted_at desc limit 1;
  return jsonb_build_object('kind', s ->> 'kind',
    'due', last.id is null or coalesce(last.next_due, (last.counted_at + interval '14 days')::date) <= (now() at time zone 'Europe/Paris')::date,
    'last', case when last.id is null then null else jsonb_build_object('counted_at', last.counted_at, 'items', last.items, 'summary', last.summary, 'next_due', last.next_due) end);
end $$;

-- Une image du film de stock (40 au plus en attente par stock).
create or replace function stock_add_frame(p_space text, p_token text, p_ref uuid, p_content_type text, p_data_b64 text, p_first boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare s jsonb; bytes bytea;
begin
  s := stock_scope(p_space, p_token, p_ref);
  if p_content_type not in ('image/jpeg', 'image/png', 'image/webp') then raise exception 'PHOTO_INVALIDE: format non accepté.'; end if;
  bytes := decode(coalesce(p_data_b64, ''), 'base64');
  if octet_length(bytes) = 0 or octet_length(bytes) > 1500000 then raise exception 'PHOTO_INVALIDE: image vide ou trop lourde.'; end if;
  -- Nouveau film : les images d'un film précédent resté sans analyse sont écartées.
  if p_first then delete from stock_frames where scope_kind = s ->> 'kind' and scope_id = (s ->> 'id')::uuid; end if;
  if (select count(*) from stock_frames where scope_kind = s ->> 'kind' and scope_id = (s ->> 'id')::uuid) >= 40 then raise exception 'PHOTO_INVALIDE: trop d''images, recommencez le film.'; end if;
  insert into stock_frames(scope_kind, scope_id, content_type, data) values (s ->> 'kind', (s ->> 'id')::uuid, p_content_type, bytes);
  return s;
end $$;
revoke all on function stock_status(text, text, uuid), stock_add_frame(text, text, uuid, text, text, boolean) from public;
grant execute on function stock_status(text, text, uuid), stock_add_frame(text, text, uuid, text, text, boolean) to anon, authenticated;

-- Pour l'IA : les images du film, le comptage précédent et le rythme des passages (par semaine, sur les 28 derniers jours).
create or replace function automation_stock_input(p_secret text, p_kind text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare last stock_counts; per_week numeric; label text;
begin
  perform automation_guard(p_secret);
  select * into last from stock_counts where scope_kind = p_kind and scope_id = p_id order by counted_at desc limit 1;
  if p_kind = 'site' then
    select round(count(*) / 4.0, 1) into per_week from interventions where site_id = p_id and scheduled_date between current_date - 28 and current_date and stage <> 'annulee';
    select s.name into label from sites s where s.id = p_id;
  elsif p_kind = 'staff' then
    select round(count(*) / 4.0, 1) into per_week from interventions where staff_id = p_id and scheduled_date between current_date - 28 and current_date and stage <> 'annulee';
  else
    select round(count(*) / 4.0, 1) into per_week from cleaning_jobs where cleaner_id = p_id and job_date between current_date - 28 and current_date and status not in ('ouverte', 'annulee');
  end if;
  return jsonb_build_object('label', label, 'per_week', coalesce(per_week, 0),
    'previous', case when last.id is null then null else jsonb_build_object('counted_at', last.counted_at, 'items', last.items) end,
    'frames', coalesce((select jsonb_agg(jsonb_build_object('content_type', x.content_type, 'b64', replace(encode(x.data, 'base64'), E'\n', '')) order by x.created_at, x.id)
                          from (select id, content_type, data, created_at from stock_frames where scope_kind = p_kind and scope_id = p_id order by created_at desc, id desc limit 16) x), '[]'::jsonb));
end $$;

-- Enregistre le comptage et efface les images du film.
create or replace function automation_stock_save(p_secret text, p_kind text, p_id uuid, p_by text, p_items jsonb, p_summary text, p_next_due date) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  perform automation_guard(p_secret);
  if p_kind not in ('site', 'staff', 'cleaner') or jsonb_typeof(p_items) <> 'array' then raise exception 'ARGUMENT: comptage invalide'; end if;
  insert into stock_counts(scope_kind, scope_id, counted_by, items, summary, next_due) values (p_kind, p_id, left(p_by, 120), p_items, left(p_summary, 500), p_next_due) returning id into cid;
  delete from stock_frames where scope_kind = p_kind and scope_id = p_id;
  return cid;
end $$;
revoke all on function automation_stock_input(text, text, uuid), automation_stock_save(text, text, uuid, text, jsonb, text, date) from public;
grant execute on function automation_stock_input(text, text, uuid), automation_stock_save(text, text, uuid, text, jsonb, text, date) to anon, authenticated;
