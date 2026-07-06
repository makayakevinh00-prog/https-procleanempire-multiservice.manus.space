# Meta Ads - ProClean Empire

Module independant (n'affecte pas le site Next.js) pour piloter les campagnes Meta Ads via la Marketing API officielle.

## 1. Obtenir les identifiants Meta

1. Cree une app sur developers.facebook.com, ajoute le produit "Marketing API".
2. Dans business.facebook.com, va dans **Business Settings > System Users**, cree un system user (ex. "admin-ads"),
   assigne-lui le compte publicitaire concerne.
3. Genere un token d'acces pour ce system user avec la permission **ads_management**
   (et **business_management** si plusieurs comptes/pages sont geres).
4. Recupere l'**ID du compte publicitaire** dans Ads Manager, format `act_XXXXXXXXXX`.

## 2. Configuration

```bash
cd meta-ads
cp .env.example .env
# renseigner META_ACCESS_TOKEN et META_AD_ACCOUNT_ID dans .env
npm install
```

`.env` est ignore par git (`.gitignore`) — ne jamais committer de token.

## 3. Commandes disponibles

```bash
npm run campaigns:list
npm run campaigns:create -- --name "Devis Bureaux Q3" --objective OUTCOME_LEADS --daily-budget 2000
npm run campaigns:status -- --id <campaign_id> --status ACTIVE

npm run adsets:list -- --campaign-id <campaign_id>
npm run adsets:create -- --name "Ile-de-France 25-55" --campaign-id <campaign_id> \
  --targeting '{"geo_locations":{"countries":["FR"]},"age_min":25,"age_max":55}' --daily-budget 2000

npm run ads:list -- --adset-id <adset_id>

npm run insights -- --level campaign --date-preset last_30d
```

Toutes les campagnes/ad sets sont crees **en pause** par defaut — passe-les en `ACTIVE` volontairement
via `campaigns:status` / `adsets:status` une fois verifies dans Ads Manager.

## 4. Structure

- `src/client.js` — initialise le SDK avec le token et l'ID de compte
- `src/campaigns.js` — creer/lister/changer le statut des campagnes
- `src/adsets.js` — creer/lister/changer le statut des ad sets (ciblage, budget)
- `src/ads.js` — creer une creative lien + une ad, lister les ads
- `src/insights.js` — recuperer les performances (depenses, clics, CTR, conversions)
- `src/cli.js` — interface en ligne de commande regroupant tout ce qui precede

## Limites actuelles

- `createLinkAdCreative` couvre le cas d'une creative "lien" simple (image + texte + bouton).
  D'autres formats (carrousel, video, collection) demanderaient une fonction dediee.
- Pas de gestion automatique du refresh de token: les tokens System User long-duree n'expirent
  pas tant que les permissions ne sont pas revoquees, mais surveille les erreurs 190 (token invalide).
