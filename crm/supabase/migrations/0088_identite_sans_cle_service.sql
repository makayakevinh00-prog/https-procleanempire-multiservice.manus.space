-- 0088 — Vérification d'identité sans clé « service » : l'enregistrement de la session et du résultat passe par deux fonctions de la base.
-- Le démarrage est protégé par le lien personnel du nettoyeur ; le résultat (vérifié ou non) ne peut être écrit qu'avec un secret serveur (stocké ici, jamais lisible côté public).
create table if not exists app_secrets (key text primary key, value text not null);
alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

create or replace function cleaner_identity_start(p_token text, p_session text) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_pending_by_token(p_token);
begin
  if p_session !~ '^vs_[A-Za-z0-9]+$' then raise exception 'ARGUMENT: session invalide'; end if;
  update cleaners set identity_status = 'en_cours', identity_session_id = p_session where id = c.id and identity_status in ('a_verifier', 'en_cours', 'echec');
end $$;

create or replace function cleaner_identity_apply(p_secret text, p_id uuid, p_session text, p_status text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select value from app_secrets where key = 'identity_sync') then raise exception 'ACCES: refusé'; end if;
  if p_status not in ('a_verifier', 'en_cours', 'verifie', 'echec') then raise exception 'ARGUMENT: statut invalide'; end if;
  update cleaners set identity_status = p_status, identity_verified_at = case when p_status = 'verifie' then now() else null end where id = p_id and identity_session_id = p_session and identity_status <> 'non_requis';
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_identity_start(text,text)', 'cleaner_identity_apply(text,uuid,text,text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
