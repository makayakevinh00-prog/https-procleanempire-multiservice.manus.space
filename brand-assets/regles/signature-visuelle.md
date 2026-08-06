# Signature visuelle — le gabarit corporate

Les cinq éléments qui reviennent sur **chaque** publication corporate. C'est leur
répétition, et rien d'autre, qui rend un post reconnaissable sans lire le nom.

Format de référence : **1080 × 1350**, marge **72 px**.

```
┌──────────────────────────────────┐  0
│ ▮▮ PROCLEAN EMPIRE               │  62   ① logo, toujours ici
│  ░░ fondu bleu nuit ░░░░░░░░░░░  │  240  ② bandeau de tête
│                                  │
│                                  │
│        P H O T O                 │       ③ 78 % du visuel
│                                  │
│                                  │
│                                  │
├──────────────────────────────────┤  1050 ④ bandeau bleu nuit plein
│  ──                              │  1110 ⑤ ligne d'accent
│  L'EXCELLENCE NE SE DIT PAS.     │  1150
│  ELLE SE VOIT.                   │
└──────────────────────────────────┘  1350
```

## ① Logo — toujours en haut à gauche

| Élément | x | y | l × h |
|---|---|---|---|
| Bandes (skyline) | 72 | 62 | 45 × 52 |
| Mot-marque `PROCLEAN EMPIRE` | 133 | 74 | 500 × auto |

Blanc sur photo, bleu nuit sur fond clair. Mot-marque à **24 px, gras**.
Le logo ne change **jamais** de position, de taille ni d'alignement.

> ⚠️ Le logo posé dans Canva est une **reconstruction vectorielle** des bandes.
> Déposer `public/media/logo/proclean-empire-logo.png` (version blanche) dans le dossier
> Canva *Composants* et le substituer. La position et la taille sont déjà réglées.

## ② Bandeau de tête — fondu en trois paliers

L'API Canva ne fait pas de dégradés. Trois bandes empilées les simulent, **envoyées à
l'arrière-plan** après insertion :

| y | h | Couleur | Opacité |
|---|---|---|---|
| 0 | 130 | `#0A1A2F` | 0,52 |
| 130 | 55 | `#0A1A2F` | 0,33 |
| 185 | 55 | `#0A1A2F` | 0,15 |

Sert uniquement à garantir le contraste du logo. Sur une photo déjà sombre en haut,
descendre à 0,35 / 0,22 / 0,10.

## ③ Photo

De 0 à 1050 — **78 % du visuel**. Plein cadre, jamais recadrée dans un bloc.
Locaux modernes, lumière naturelle, verre impeccable, sol réfléchissant,
aucune personne, aucun matériel de nettoyage visible.
Critères complets : `photos.md`.

## ④ Bandeau bleu nuit — le socle

`#12294A` plein, de **1050 à 1350** (300 px). Opaque, jamais transparent.
C'est lui qui porte le message. Il ne bouge pas d'une publication à l'autre.

## ⑤ Ligne d'accent

`#4A93F0`, **96 × 5 px**, à **72 / 1110**. Toujours au-dessus du slogan,
toujours à la même place. C'est le détail que personne ne remarque
consciemment et que tout le monde reconnaît.

## Le slogan

- **6 à 8 mots**, un seul message.
- **MAJUSCULES**, blanc, gras, **56 px**, interlignage **0,95**, deux lignes.
- Structure de marque : **un constat, puis un renversement.**

| Validé | |
|---|---|
| L'EXCELLENCE NE SE DIT PAS. / ELLE SE VOIT. | ✅ en production |
| VOTRE IMAGE COMMENCE AVANT LE PREMIER BONJOUR. | réserve |
| ON NE REMARQUE QUE CE QUI N'A PAS ÉTÉ FAIT. | réserve |
| LA CONFIANCE NE SE DEMANDE PAS. ELLE S'ENTRETIENT. | réserve |

> Les MAJUSCULES sont ici une exception assumée au registre corporate
> (`typographie.md` les réserve aux titres de 3 mots). Elle vaut **pour ce gabarit
> uniquement** — pas pour les rubriques éditoriales.

## Palette

Quatre couleurs, jamais plus : bleu nuit `#0A1A2F` / `#12294A` · bleu ProClean
`#4A93F0` · gris `#7A8BA0` · blanc. Le bleu nuit domine.

## L'Inspecteur ProClean

Zone réservée **bas-droite au-dessus du bandeau** : x 814, y 618, 194 × 432.
Laissée vide tant que les PNG détourés n'existent pas (`../mascotte/README.md`).

Sur ce gabarit corporate, sa présence est **facultative** : le message porte seul.
Il s'ajoute quand la publication conseille, valide ou inspecte.

## Le test

> Entre une publication Apple et une publication Anaveo sur LinkedIn,
> est-ce que celle-ci tient sa place ?

Si l'hésitation dure plus d'une seconde, retirer un élément. Jamais en ajouter un.
