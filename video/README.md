# Vidéos ProClean Empire (Remotion)

Projet [Remotion](https://www.remotion.dev) permettant de générer les vidéos de
présentation de ProClean Empire en code. Il vit à côté du site Next.js et
réutilise directement ses visuels : `remotion.config.ts` pointe le dossier
public de Remotion vers le `public/` du site, donc `staticFile("media/...")`
résout `public/media/...` du site. Aucune image n'est dupliquée.

## Compositions

| Composition | Format | Usage |
| --- | --- | --- |
| `PromoLandscape` | 1920×1080, 33 s | Site web, YouTube, écrans d'accueil |
| `PromoVertical` | 1080×1920, 33 s | YouTube Shorts, Reels, TikTok |
| `SocialCard` | 1200×630, image fixe | Miniature vidéo et image Open Graph |

Les deux vidéos partagent exactement les mêmes scènes : la mise en page se
calcule à partir du plus petit côté (`src/layout.ts`), ce qui évite de
maintenir deux montages.

## Commandes

```bash
cd video
npm install

npm run dev              # ouvre Remotion Studio (prévisualisation + timeline)
npm run render           # exporte out/proclean-promo-landscape.mp4
npm run render:vertical  # exporte out/proclean-promo-vertical.mp4
npm run render:card      # exporte out/social-card.png
npm run lint             # eslint + typecheck
```

Les fichiers exportés arrivent dans `video/out/`, qui n'est pas versionné.

### Rendu sans téléchargement de Chrome

Au premier rendu, Remotion télécharge Chrome Headless Shell. Si le
téléchargement est bloqué (réseau restreint, CI), indiquez un Chrome déjà
installé :

```bash
npx remotion render PromoLandscape out/promo.mp4 \
  --browser-executable=/chemin/vers/chrome
```

## Modifier le contenu

Tout le texte, les couleurs et la liste des photos sont regroupés dans
`src/brand.ts` — c'est le seul fichier à éditer pour changer un chiffre, un
service ou un visuel. Les valeurs reprennent celles du site
(`tailwind.config.ts`, `lib/site.ts`, `lib/content/phase1.ts`) : pensez à les
mettre à jour ici quand le site change.

## Structure

```
src/
  brand.ts             couleurs, textes, coordonnées, chemins des visuels
  layout.ts            échelle de mise en page partagée 16:9 / 9:16
  Composition.tsx      déclaration des compositions
  ProCleanPromo.tsx    montage : enchaînement des scènes et durées
  components/          fond animé, logo, helpers d'animation
  scenes/              une scène par séquence du montage
```

Pour changer le rythme du montage, ajustez `sceneDurations` dans
`src/ProCleanPromo.tsx` (valeurs en images, à 30 images/seconde) : la durée
totale des compositions en découle automatiquement.

## À propos du logo

Le logo de la marque est un visuel sombre sur fond transparent. Sur le fond
bleu nuit des vidéos, il est posé sur un cartouche blanc
(`src/components/Logo.tsx`) afin de rester lisible sans altérer ses couleurs.

## Licence Remotion

Remotion est gratuit pour les équipes jusqu'à 3 personnes ; au-delà une licence
société est nécessaire. [Conditions](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
