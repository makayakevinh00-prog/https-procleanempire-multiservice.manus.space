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
| `TikTok` | 1080×1920 | Montage des rushes filmés sur chantier (TikTok / Reels) |
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

## Montage TikTok / Reels

La composition `TikTok` monte vos rushes filmés sur le terrain. Tout se règle
dans **`src/tiktok/edit.ts`** : la liste des plans, le point d'entrée, la durée,
le texte, le sens du zoom, la musique.

```bash
npm run render:tiktok   # exporte out/proclean-tiktok.mp4
```

### Ajouter vos rushes

1. Déposez les fichiers dans `public/media/videos/` (dossier du site).
2. Relevez leur durée : `npx remotion ffprobe public/media/videos/mon-rush.mp4`.
   Regardez aussi la ligne `rotation` : une vidéo de téléphone est souvent
   stockée en paysage avec une rotation, donc réellement verticale.
3. Ajoutez une entrée dans `shots` (durées en images, 30 images = 1 seconde).
4. `npm run dev` pour caler les coupes dans la timeline, puis rendu.

### Techniques appliquées

- **Accroche sur le premier plan** : le texte le plus fort arrive immédiatement,
  seul à l'écran. C'est la première seconde qui décide du reste.
- **Sous-titres incrustés mot par mot**, mot en cours en doré : la majorité des
  vues se font sans le son, le texte doit suffire.
- **Zones de sécurité** (`src/tiktok/safeZones.ts`) : rien d'important sous les
  boutons de l'application ni sous la description.
- **Zoom permanent** sur chaque plan : une image fixe fait décrocher.
- **Flash blanc sur les coupes** : relance l'attention et masque l'écart de
  lumière entre deux rushes.
- **Barre de progression** : montrer que la vidéo est courte réduit l'abandon.
- **Carte de fin très courte** et fondu, pour ne pas casser la boucle.
- **Fond flouté automatique** si un rush est horizontal, pour remplir le 9:16
  sans bandes noires.

### Le son

Le son d'origine des rushes est conservé (réglable par plan avec `sound`). Pour
ajouter une musique, déposez le fichier dans `public/media/audio/` et renseignez
`music.src` dans `edit.ts` : elle sera mixée sous le son direct avec fondus.

Pour un son tendance, mieux vaut l'ajouter dans l'application TikTok au moment
de la publication : un son ajouté depuis la bibliothèque TikTok est rattaché à
la page du son et vous fait bénéficier de sa distribution, ce qu'un fichier
incrusté au montage ne permet pas. C'est aussi ce qui évite les problèmes de
droits sur une musique commerciale.

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
