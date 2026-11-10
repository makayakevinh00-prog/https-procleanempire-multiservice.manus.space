-- 0019 — Rôle comptable : accès lecture seule aux factures
-- Permet de donner un accès CRM à un comptable externe sans double saisie.
-- Le comptable voit uniquement les factures, les lignes et les noms de clients.
-- Il ne peut rien modifier, ni créer, ni supprimer.

-- ── 1. Ajout du rôle dans la contrainte ──────────────────────────────────────
alter table staff drop constraint if exists staff_role_check;
alter table staff drop constraint if exists staff_role_check1;
-- recréer en incluant 'comptable'
alter table staff add constraint staff_role_check
  check (role in ('agent', 'responsable', 'comptable'));

-- ── 2. Fonction d'identification comptable ───────────────────────────────────
create or replace function is_comptable() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid()
      and role = 'comptable'
      and active = true
  )
$$;
revoke execute on function is_comptable() from public, anon;

-- ── 3. RLS lecture-seule sur les tables financières ──────────────────────────

-- invoices
drop policy if exists invoices_comptable_read on invoices;
create policy invoices_comptable_read on invoices
  for select to authenticated
  using (is_comptable());

-- invoice_lines
drop policy if exists invoice_lines_comptable_read on invoice_lines;
create policy invoice_lines_comptable_read on invoice_lines
  for select to authenticated
  using (is_comptable());

-- clients (nom + email du client pour l'entête de facture)
drop policy if exists clients_comptable_read on clients;
create policy clients_comptable_read on clients
  for select to authenticated
  using (is_comptable());

-- ── 4. Le comptable peut lire sa propre ligne staff (pour connaître son rôle) ─
alter table staff enable row level security;
drop policy if exists staff_self_read on staff;
create policy staff_self_read on staff
  for select to authenticated
  using (user_id = auth.uid() or is_owner());

-- ── 5. Exemple d'utilisation (non exécuté) ───────────────────────────────────
-- Pour créer le compte :
--   1. Supabase Dashboard → Authentication → Users → Invite user (e-mail comptable)
--   2. Récupérer le UUID de l'utilisateur créé
--   3. Insérer dans staff :
--      insert into staff (full_name, email, role, user_id, active)
--      values ('Prénom Nom', 'comptable@cabinet.fr', 'comptable', '<UUID>', true);
