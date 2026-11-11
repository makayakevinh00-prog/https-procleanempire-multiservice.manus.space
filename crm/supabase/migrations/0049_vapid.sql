-- 0049 — Clés des notifications (VAPID) générées par le serveur au premier usage et gardées ici : aucune lecture directe, secret serveur exigé.
create table if not exists vapid_keys (
  id boolean primary key default true check (id),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table vapid_keys enable row level security;
revoke all on vapid_keys from anon, authenticated;

-- Renvoie la paire existante ; sinon enregistre celle proposée (jamais deux paires).
create or replace function automation_vapid_keys(p_secret text, p_pub text, p_priv text) returns jsonb language plpgsql security definer set search_path = public as $$
declare k vapid_keys;
begin
  perform automation_guard(p_secret);
  select * into k from vapid_keys;
  if not found then
    if coalesce(p_pub, '') = '' or coalesce(p_priv, '') = '' then return null; end if;
    insert into vapid_keys(public_key, private_key) values (p_pub, p_priv) on conflict do nothing;
    select * into k from vapid_keys;
  end if;
  return jsonb_build_object('public', k.public_key, 'private', k.private_key);
end $$;
revoke all on function automation_vapid_keys(text, text, text) from public;
grant execute on function automation_vapid_keys(text, text, text) to anon, authenticated;
