# /Expressions — L'Inspecteur ProClean

Les **bustes d'expression** du personnage : ceux de la ligne EXPRESSIONS de la planche
de référence, plus les extensions nécessaires au calendrier éditorial.

`manifest` : `expressions.json` · PNG : `png/`

## Comment choisir une expression

On ne choisit pas une expression parce qu'elle est jolie. On part de **l'intention
du message** :

| Ce que dit le visuel | Expression |
|---|---|
| Je donne un conseil | `doigt-leve` |
| Je révèle un fait | `loupe-oeil` |
| Je valide un résultat | `ok-main` |
| Je montre un détail invisible | `loupe-detail` |
| Je cite un client | `bras-croises` |
| Je pose une question | `reflexion` |
| J'accompagne une photo | `regarde-photo` |
| Je montre un chiffre | `montre-tablette` |
| J'ouvre une série | `salut` *(dans `../mascotte/`)* |
| Je prouve la propreté | `gant-blanc` *(dans `../mascotte/`)* |

## Les 5 expressions de la planche de référence

| Expression | Rubrique | Sous-titre officiel |
|---|---|---|
| `doigt-leve` | 💡 Le conseil de l'Inspecteur | Conseil d'expert |
| `loupe-oeil` | 🧪 Le saviez-vous ? | Fait utile & concret |
| `ok-main` | ⭐ Alan valide | Avant / Après · Réalisations |
| `loupe-detail` | 👀 L'œil de l'Inspecteur | Le détail que personne ne voit |
| `bras-croises` | ⭐ Retour client vérifié | Avis & Témoignages |

Ces cinq couples expression / rubrique sont **fixes**. On ne met pas `loupe-detail`
sur un post « Le conseil de l'Inspecteur ».

## Miroir

Certaines expressions sont directionnelles (`regarde-photo`, `loupe-detail`,
`doigt-pointe`). Il en faut **toujours deux versions**, gauche et droite : l'Inspecteur
regarde vers l'intérieur du visuel, jamais vers l'extérieur du cadre.

Suffixe de la version miroir : `-gauche`.

```
inspecteur-regarde-photo-buste.png          → il regarde vers la droite
inspecteur-regarde-photo-gauche-buste.png   → il regarde vers la gauche
```

⚠️ Un miroir se produit à l'export, pas par un `scaleX(-1)` dans Canva :
le pin's ProClean et la raie du costume se retrouveraient inversés.

## Spécifications d'export

Identiques à `../mascotte/README.md` : PNG 32 bits, 2400 px de haut minimum, sRGB,
détourage net, aucune ombre incrustée.

## État actuel

⚠️ **`png/` est vide.** Voir `../mascotte/README.md` → « Action requise ».
