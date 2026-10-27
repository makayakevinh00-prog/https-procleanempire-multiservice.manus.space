# ProClean CRM

CRM interne de ProClean Empire (remplace Axonaut) — Next.js 14 (App Router) · Supabase (PostgreSQL + Auth) · Tailwind · PDF via `pdf-lib`.
Application **séparée du site vitrine** (qui est à la racine du dépôt) : à déployer comme un second projet Vercel.

## Mise en service (≈ 15 min)

1. **Supabase** : créer un projet, puis dans *SQL Editor* exécuter dans l'ordre
   `supabase/migrations/0001_schema.sql` puis `supabase/seed.sql` (idempotent).
2. **Auth** : *Authentication → Users → Add user* (`contact@procleanempire.com` + mot de passe), puis
   *Authentication → Sign In / Providers* → **désactiver « Allow new users to sign up »**.
   La base n'autorise de toute façon que l'e-mail `app_settings.owner_email` (RLS).
3. **Vercel** : *New Project* → même dépôt → **Root Directory = `crm`** → variables d'environnement de `.env.example`
   (`SUPABASE_SERVICE_ROLE_KEY` : serveur uniquement).
4. **Paramètres** (`/parametres`) : SIRET, TVA, IBAN (pied de facture), coûts horaires, seuils.
5. **Contrats** : renseigner *heures par intervention* et *fréquence* — les données initiales ne les contiennent pas,
   le tableau de recrutement signale les sites incomplets au lieu d'inventer des heures.

En local : `cp .env.example .env.local`, `npm install`, `npm run dev` (port 3100). Tests : `npm test`.

## Règles métier et où elles sont appliquées

| Règle | Application |
|---|---|
| Facture jamais émise sans validation manuelle | Contraintes SQL `invoice_requires_validation` / `invoice_draft_is_clean` + RPC `validate_invoice` : aucune route (même l'API) ne peut sortir une facture de « brouillon » sans `validated_at` + numéro |
| Numérotation `F-2026-001`, sans trou | Numéro attribué **à la validation** (compteur atomique) ; facture validée = immuable (lignes verrouillées, suppression interdite → annulation avec motif) |
| Contacts réservés | Badge rouge partout ; confirmation explicite (case) pour toute action ; **relance automatique refusée par la base** ; jamais de rapprochement bancaire automatique |
| Relance : vérifier l'historique | RPC `register_reminder` : refuse si relance récente (délai configurable) sauf forçage manuel explicite ; compteur + date mis à jour atomiquement ; e-mail raté → relance annulée (`undo_reminder`) |
| Montant > 1500 € HT | Confirmation explicite (seuil configurable) à la conversion devis→facture et à la validation ; pas de relance auto au-dessus du seuil |
| Devis → facture | Crée un **brouillon** ; validation manuelle ensuite |

## Qonto

`/paiements` → « Synchroniser Qonto » (et cron quotidien). Variables : `QONTO_ACCESS_TOKEN` (OAuth Bearer)
**ou** `QONTO_ORGANIZATION_SLUG` + `QONTO_SECRET_KEY` (clé API historique). Seuls les virements **certains**
(n° de facture dans le libellé + montant exact, hors contact réservé) sont rapprochés automatiquement ; les autres
sont proposés pour confirmation en un clic.

## Crons Vercel (`vercel.json`)

`/api/qonto/sync` (06:30 UTC) et `/api/cron/reminders` (07:00 UTC) — exigent `Authorization: Bearer $CRON_SECRET`
(Vercel l'ajoute automatiquement si `CRON_SECRET` est défini). Les relances automatiques sont **désactivées par défaut**.

## Hypothèses à confirmer

- TVA 20 % par défaut (cohérent avec 129,17 € HT = 155 € TTC) ; modifiable ligne par ligne.
- Coûts de recrutement par défaut (indépendant 22 €/h ; salarié 12,02 € brut + 10 % congés + 42 % de charges) : **valeurs d'amorçage, à ajuster**.
- « Alerte impayés > X jours » = jours de retard **après échéance**.
