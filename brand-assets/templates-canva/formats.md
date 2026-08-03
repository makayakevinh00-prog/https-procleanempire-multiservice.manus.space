# Formats et gabarits Canva

Toutes les coordonnées sont en pixels, sur un canevas **1080 × 1350** sauf mention
contraire. Origine en haut à gauche.

## Formats

| Format | Dimensions | Marge | Usage |
|---|---|---|---|
| Post portrait | 1080 × 1350 | 72 | **format par défaut du feed** |
| Post carré | 1080 × 1080 | 64 | grille, avant/après |
| Carrousel | 1080 × 1350 | 72 | séries pédagogiques |
| Story | 1080 × 1920 | 80 | + zone sûre 250 en haut, 320 en bas |
| Présentation | 1920 × 1080 | 120 | decks clients |

**Largeur utile** en 1080 × 1350 : `1080 − 144 = 936 px`.
**Grille :** 12 colonnes, gouttière 24 px.

---

## Gabarit A — Photo + titre

Le gabarit le plus utilisé. La photo porte le message, le titre le nomme,
l'Inspecteur l'accompagne.

```
┌──────────────────────────────────┐  0
│  ▣ badge rubrique  (72, 72)      │
│                                  │
│                                  │
│        P H O T O                 │
│      (plein cadre)               │
│                                  │
│                                  │
│ ░░░ voile bleu nuit ░░░░░░░░░░░  │  742  (45 % bas)
│                                  │
│  Ce n'est pas la vitre      ┌──┐ │
│  qui compte.                │🦊│ │
│  C'est la lumière.          └──┘ │
│  ── PROCLEAN EMPIRE              │  1278
└──────────────────────────────────┘  1350
```

| Élément | x | y | l × h | Réglage |
|---|---|---|---|---|
| Photo | 0 | 0 | 1080 × 1350 | plein cadre, recadrée 4:5 |
| `voile-photo.svg` | 0 | 0 | 1080 × 1350 | superposé |
| Badge rubrique sombre | 72 | 72 | 470 × 72 | |
| Titre | 72 | 940 | 620 × auto | Titre L 72 px, 3 lignes max |
| **Mascotte** silhouette | **814** | **846** | **194 × 432** | pieds à y = 1278 |
| Signature | 72 | 1290 | — | mention 22 px |

Respiration titre ↔ mascotte : **122 px** (> 0,25 × 432 = 108 ✅)

---

## Gabarit B — Conseil, fond clair

```
┌──────────────────────────────────┐
│  ▣ LE CONSEIL DE L'INSPECTEUR    │  72
│                                  │
│  Une vitre propre                │  260
│  ne se voit pas.                 │
│  C'est exactement                │
│  le but.                         │
│                                  │
│  ───                             │  700
│                                  │
│  Texte d'appui, deux lignes      │  760
│  maximum, jamais plus.           │
│                            ┌──┐  │
│                            │🦊│  │  978
│  ── PROCLEAN EMPIRE        └──┘  │  1278
└──────────────────────────────────┘
```

| Élément | x | y | l × h | Réglage |
|---|---|---|---|---|
| `fond-clair.svg` | 0 | 0 | 1080 × 1350 | |
| Badge rubrique clair | 72 | 72 | 470 × 72 | |
| Titre | 72 | 260 | 700 × auto | Titre XL 96 px, 4 lignes max |
| `separateur-accent.svg` | 72 | 700 | 300 × 8 | |
| Texte d'appui | 72 | 760 | 620 × auto | Corps L 36 px |
| **Mascotte** buste | **770** | **978** | **238 × 300** | expression selon rubrique |
| Signature | 72 | 1290 | — | |

---

## Gabarit C — Le chiffre de la semaine

```
┌──────────────────────────────────┐
│  📊 LE CHIFFRE DE LA SEMAINE     │  148
│                                  │
│                                  │
│      8 7 %                       │  540   ← 240 px
│                                  │
│  des salissures visibles         │  880
│  sont dans les angles.      ┌──┐ │
│                             │🦊│ │  846
│  ── PROCLEAN EMPIRE         └──┘ │  1278
└──────────────────────────────────┘
```

| Élément | x | y | l × h | Réglage |
|---|---|---|---|---|
| `fond-bleu-nuit.svg` | 0 | 0 | 1080 × 1350 | |
| Icône `chiffre` | 72 | 148 | 40 × 40 | `#4A93F0`, **version pleine** |
| Surtitre | 132 | 148 | 600 × auto | Surtitre 28 px, `#4A93F0` |
| Chiffre | 72 | 540 | 620 × auto | **240 px**, ExtraBold, blanc, interlignage 0,95 |
| Phrase | 72 | 880 | 620 × auto | Corps L 36 px, `#7A8BA0`, interlignage 1,45 |
| **Mascotte** `presente-paume` | 814 | 846 | 194 × 432 | il présente le chiffre |
| Signature | 72 | 1284 | 700 × auto | Mention 22 px, `#7A8BA0` |

*Coordonnées vérifiées par construction réelle dans Canva — le chiffre à 240 px occupe
la bande 540 → 828, la phrase ne peut donc pas démarrer avant 880.*

---

## Gabarit D — Avant / après

```
┌────────────────┬─────────────────┐
│                ║                 │
│    AVANT       ║     APRÈS       │
│                ║                 │
│    photo       ║     photo       │
│                ║                 │
│  ▣ AVANT       ║  ▣ APRÈS   ┌──┐ │
│                ║            │🦊│ │
└────────────────┴─────────────────┘
```

| Élément | x | y | l × h |
|---|---|---|---|
| Photo AVANT | 0 | 0 | 537 × 1350 |
| Filet blanc | 537 | 0 | 6 × 1350 |
| Photo APRÈS | 543 | 0 | 537 × 1350 |
| `badge-avant.svg` | 72 | 1150 | 190 × 64 |
| `badge-apres.svg` | 615 | 1150 | 190 × 64 |
| **Mascotte** `ok-main` buste | 770 | 978 | 238 × 300 |
| Signature | 72 | 1290 | — |

**Non négociable :** même point de vue, même focale, même lumière sur les deux photos.
Voir `../regles/photos.md`.

---

## Gabarit E — Retour client vérifié

| Élément | x | y | l × h | Réglage |
|---|---|---|---|---|
| `fond-bleu-nuit.svg` | 0 | 0 | 1080 × 1350 | |
| Badge rubrique sombre | 72 | 72 | 470 × 72 | icône `retour-client` |
| Guillemet | 72 | 300 | — | 160 px, `#1E6FD8`, opacité 40 % |
| Citation | 72 | 420 | 700 × auto | Titre L 72 px, blanc, 4 lignes max |
| Nom + fonction | 72 | 960 | — | Mention 22 px, `#7A8BA0` |
| **Mascotte** `bras-croises` | 814 | 846 | 194 × 432 | |
| Signature | 72 | 1290 | — | |

---

## Gabarit F — Couverture de carrousel

| Élément | x | y | l × h | Réglage |
|---|---|---|---|---|
| Photo ou `fond-bleu-nuit.svg` | 0 | 0 | 1080 × 1350 | + `voile-photo.svg` si photo |
| Surtitre | 72 | 150 | — | 28 px, `#4A93F0` |
| Titre | 72 | 240 | 700 × auto | **Titre XL 96 px**, 4 lignes max |
| **Mascotte** `salut` | 814 | 846 | 194 × 432 | il ouvre la série |
| « Faites glisser → » | 72 | 1250 | — | Mention 22 px, opacité 55 % |

---

## Gabarit G — Slide intérieure de carrousel

| Élément | x | y | l × h | Réglage |
|---|---|---|---|---|
| `fond-clair.svg` ou `fond-filets.svg` | 0 | 0 | 1080 × 1350 | alterner clair / sombre |
| Numéro d'étape | 72 | 180 | — | 120 px, `#1E6FD8`, opacité 25 % |
| Titre d'étape | 72 | 340 | 700 × auto | Titre M 56 px |
| Texte | 72 | 560 | 620 × auto | Corps M 30 px, 4 lignes max |
| Photo ou icône | 72 | 760 | 620 × 400 | optionnelle, rayon 32 |
| **Mascotte** buste | 770 | 978 | 238 × 300 | **change tous les 2 slides** |
| `badge-numero-slide.svg` | 888 | 1230 | 120 × 56 | |

---

## Gabarit H — Slide finale de carrousel

| Élément | x | y | l × h |
|---|---|---|---|
| `fond-bleu-nuit.svg` | 0 | 0 | 1080 × 1350 |
| Titre de clôture | 72 | 380 | 700 × auto |
| **Mascotte** `gant-blanc` ou `salut` | 814 | 700 | 194 × 432 |
| `cta-bandeau-final.svg` | 0 | 1050 | 1080 × 300 |

---

## Story — 1080 × 1920

- Marge 80 px. **Zone sûre : rien d'important au-dessus de y = 250 ni sous y = 1600.**
- Mascotte silhouette : 614 px de haut, pieds à y = 1600, x = 730.
- Un seul message par story. Titre L 72 px maximum.
- Variante « posée au sol » autorisée : pieds au bord bas à y = 1920.

## Présentation — 1920 × 1080

- Marge 120 px. Échelle typographique × 1,4.
- Mascotte : buste 422 px de large en page de couverture, silhouette 346 px de haut
  dans les pages intérieures.
- Elle apparaît sur : couverture, transitions de chapitre, pages conseils, FAQ,
  pages services, études de cas, statistiques, page d'appel à l'action.
- Elle **n'apparaît pas** sur les pages de tableau dense ni sur les pages d'annexe.
