# Charte de l'Inspecteur ProClean

> Ce document fait autorité. En cas de doute sur un visuel, c'est lui qui tranche.

---

## 1. Le personnage est figé

La mascotte officielle de ProClean Empire est **L'Inspecteur ProClean**, le renard de la planche
de référence (`mascotte/PLANCHE-REFERENCE.png`).

**Verrouillé définitivement — aucune exception :**

| Élément | Statut |
|---|---|
| Visage, museau, yeux, sourcils | 🔒 figé |
| Couleurs du pelage | 🔒 figé |
| Costume bleu nuit, chemise, cravate | 🔒 figé |
| Gants blancs | 🔒 figé |
| Pin's ProClean au revers | 🔒 figé |
| Style de rendu (3D lissé, éclairage doux) | 🔒 figé |

**Interdit :**

- redessiner, restyliser ou « moderniser » le personnage
- créer une seconde mascotte, une variante enfant, animal ou humaine
- changer le costume, la couleur du costume, ajouter des accessoires non validés
- recoloriser, désaturer, passer en noir et blanc, appliquer un filtre ou une teinte
- déformer les proportions (étirement horizontal ou vertical)
- faire pivoter le personnage au-delà de ±5°
- ajouter une ombre portée dure, un contour, un halo ou un effet néon
- générer une nouvelle image du renard « à peu près pareille »

**Règle unique :** on ne crée jamais une nouvelle pose à l'improviste. On pioche dans
`mascotte/` et `expressions/`. Si la pose n'existe pas, on demande sa production — on
n'improvise pas.

---

## 2. Son rôle

L'Inspecteur ProClean **n'est pas un commercial**. Il ne nettoie pas. Il ne vend pas.

Il **observe, inspecte, explique, conseille, valide.**
Il incarne le niveau d'exigence de ProClean Empire.

Chaque publication doit donner l'impression qu'il **accompagne le lecteur**.

| ✅ Il fait ça | ❌ Il ne fait jamais ça |
|---|---|
| pointer une erreur | tenir un balai, une serpillère, un aspirateur |
| montrer un chiffre | porter un seau ou un chiffon |
| regarder une photo | brandir une promotion, un « -20 % » |
| inspecter une surface | sourire dans le vide sans lien avec le contenu |
| tenir sa tablette d'inspection | danser, courir, faire le clown |
| valider une réalisation | apparaître deux fois dans le même visuel |
| observer un détail | regarder ailleurs que le sujet du visuel |
| accompagner un texte | être posé « pour remplir un coin » |

**Test avant publication :** « Pourquoi il est là, exactement, et pourquoi cette pose-là ? »
Si la réponse n'est pas immédiate, la pose est mauvaise ou la mascotte est en trop.

---

## 3. Taille

L'Inspecteur **n'est jamais le sujet principal**. Il occupe **10 % à 20 % maximum**
de la surface du visuel.

### Silhouette complète — hauteur en % de la hauteur du visuel

| | % hauteur | 1080×1350 | 1080×1080 | 1080×1920 | 1920×1080 |
|---|---|---|---|---|---|
| Minimum | 24 % | 324 px | 260 px | 460 px | 260 px |
| **Standard** | **32 %** | **432 px** | **346 px** | **614 px** | **346 px** |
| Maximum | 40 % | 540 px | 432 px | 768 px | 432 px |

### Buste / expression — largeur en % de la largeur du visuel

| | % largeur | 1080 de large | 1920 de large |
|---|---|---|---|
| **Standard** | **22 %** | **238 px** | 422 px |
| Maximum | 28 % | 302 px | 538 px |

Au-delà du maximum, le visuel devient une affiche de mascotte : c'est refusé.

---

## 4. Placement et marges

```
┌─────────────────────────────────────┐
│  ← marge 72 px →                    │
│                                     │
│   TITRE                             │
│   (largeur utile)                   │
│                                     │
│                                     │
│                          ┌───────┐  │
│   ZONE INTERDITE         │  🦊   │  │  ← bas-droite = position par défaut
│   (centre)               │       │  │
│                          └───────┘  │
│  ← marge 72 px →                    │
└─────────────────────────────────────┘
```

- **Marge extérieure :** 72 px sur les formats 1080×1350, 64 px en 1080×1080,
  80 px en story, 120 px en 1920×1080. La mascotte ne franchit jamais cette marge.
- **Zones autorisées :** bas-droite (par défaut), bas-gauche, tiers-droit, tiers-gauche.
- **Zones interdites :** centre du visuel, par-dessus un visage sur la photo,
  par-dessus le logo, à cheval sur le titre.
- **Espace de respiration :** au minimum `0,25 × hauteur de la mascotte` entre elle et
  le bloc de texte le plus proche.
- **Exception « posé au sol » :** les pieds peuvent toucher le bord bas du visuel
  (débord vertical uniquement, jamais latéral). Utile en story.
- **Orientation :** l'Inspecteur regarde **toujours vers l'intérieur** du visuel,
  vers le sujet — jamais vers l'extérieur du cadre. S'il est à droite, il regarde à gauche.

### Lisibilité sur photo

Sur une photo chargée, poser derrière la mascotte un **voile bleu nuit `#0A1A2F`**
en dégradé de 0 % à 70 %, sur les 45 % inférieurs du visuel. Jamais de contour blanc
ni d'ombre portée dure autour du détourage.

---

## 5. Couleurs autorisées

Seules ces quatre familles composent un visuel :

| | Hex | Rôle |
|---|---|---|
| Bleu nuit profond | `#0A1A2F` | fonds pleins |
| Bleu nuit | `#12294A` | fond principal, cartouches |
| **Bleu ProClean** | `#1E6FD8` | **accent unique** — 5 à 10 % du visuel maximum |
| Bleu ProClean clair | `#4A93F0` | dégradés, traits fins sur fond sombre |
| Gris clair | `#E9EEF4` | cartes, séparateurs |
| Gris fond | `#F5F7FA` | fond clair |
| Gris texte | `#7A8BA0` | légendes, mentions |
| Blanc | `#FFFFFF` | texte sur sombre, fond clair |

**Équilibre visé :** 50-60 % bleu nuit · 30-40 % blanc/gris clair · 5-10 % bleu ProClean.

**Interdit :** jaune ou doré dominant, vert, rouge, violet, rose, turquoise,
dégradés multicolores, néons, noir pur en aplat.

Le **seul orange autorisé** dans tout le système est celui du pelage du renard.
Il n'est jamais repris ailleurs dans la mise en page — c'est ce qui fait que l'œil
va directement sur lui.

---

## 6. Fréquence

- **1 seul Inspecteur par visuel.** Jamais deux, jamais un motif répété.
- Dans un carrousel, il apparaît sur **chaque slide** mais **change de pose** au moins
  toutes les deux slides. Même pose sur 5 slides = carrousel mort.
- Sur une grille de 9 posts, **au moins 2 posts sans mascotte** (photo pleine, chiffre
  plein écran) — c'est ce qui donne du rythme et évite la saturation.

---

## 7. Erreurs à ne jamais commettre

1. Le renard collé dans un coin sans rapport avec le contenu.
2. Le renard trop grand qui devient le sujet.
3. Le renard qui cache la partie intéressante de la photo.
4. Le renard qui regarde vers l'extérieur du cadre.
5. Deux renards dans le même visuel.
6. Un renard recolorisé pour « aller avec le fond ».
7. Un renard généré à nouveau parce que la bonne pose n'était pas trouvée.
8. Un renard sur un fond jaune, vert ou flashy.
9. Un renard avec un contour blanc de détourage visible.
10. Un renard qui nettoie.
