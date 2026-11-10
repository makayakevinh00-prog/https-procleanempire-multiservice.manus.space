-- 0036 — Objectifs mensuels (CA facturé, encaissé, nouveaux clients, devis envoyés), plan d'action rédigé par l'assistant et paliers de croissance.
-- Additif. Accès réservé au patron (l'assistant passe par agent_admin_api).
create table if not exists monthly_goals (
  id uuid primary key default gen_random_uuid(),
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  kind text not null check (kind in ('ca_facture', 'encaisse', 'nouveaux_clients', 'devis_envoyes')),
  target numeric(14, 2) not null check (target > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (month, kind)
);
create table if not exists goal_plans (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  body text not null,
  author text not null default 'assistant',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists growth_thresholds (
  key text primary key check (key in ('agency_mrr', 'buyout_surplus', 'intl_revenue_12m', 'diversify_top_share')),
  value numeric(14, 2) not null check (value > 0),
  updated_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['monthly_goals', 'goal_plans', 'growth_thresholds'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;
