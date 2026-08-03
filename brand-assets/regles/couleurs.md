# Couleurs — ProClean Empire

Palette fermée. Aucune couleur n'est ajoutée sans mise à jour de ce document
et de `brand.tokens.json`.

## Palette de marque

| Nom | Hex | RGB | Usage |
|---|---|---|---|
| Bleu nuit profond | `#0A1A2F` | 10, 26, 47 | fonds pleins, dernière slide de carrousel, voile photo |
| Bleu nuit | `#12294A` | 18, 41, 74 | fond principal sombre, cartouches, bandeaux |
| **Bleu ProClean** | `#1E6FD8` | 30, 111, 216 | **accent unique** : badges, icônes, mot-clé souligné |
| Bleu ProClean clair | `#4A93F0` | 74, 147, 240 | dégradés, filets fins sur fond sombre |
| Gris clair | `#E9EEF4` | 233, 238, 244 | cartes, séparateurs, aplats secondaires |
| Gris fond | `#F5F7FA` | 245, 247, 250 | fond clair de publication |
| Gris texte | `#7A8BA0` | 122, 139, 160 | texte secondaire, légendes |
| Blanc | `#FFFFFF` | 255, 255, 255 | texte sur sombre, fond clair |

## Couleurs verrouillées de la mascotte

Ces valeurs décrivent le personnage. **Elles ne s'utilisent jamais dans la mise en page.**

| Nom | Hex |
|---|---|
| Pelage orange | `#E4622B` |
| Pelage orange clair | `#F58A3E` |
| Pelage crème | `#F7E3CB` |
| Costume navy | `#1D2E52` |
| Cravate | `#16294D` |
| Gants | `#FFFFFF` |
| Chaussures | `#131A26` |

## Équilibre d'un visuel

```
Bleu nuit (fond)          ████████████████████████  50-60 %
Blanc / gris clair        ██████████████            30-40 %
Bleu ProClean (accent)    ███                        5-10 %
Orange                    (uniquement le pelage du renard)
```

Si le bleu ProClean dépasse 10 % de la surface, il cesse d'être un accent
et le visuel perd sa hiérarchie.

## Combinaisons validées

| Fond | Titre | Accent | Mascotte |
|---|---|---|---|
| `#0A1A2F` | `#FFFFFF` | `#4A93F0` | ✅ excellent contraste |
| `#12294A` | `#FFFFFF` | `#4A93F0` | ✅ |
| `#F5F7FA` | `#0A1A2F` | `#1E6FD8` | ✅ |
| `#FFFFFF` | `#12294A` | `#1E6FD8` | ✅ |
| Photo + voile bleu nuit 70 % | `#FFFFFF` | `#4A93F0` | ✅ |

## Contraste

- Texte sur fond : ratio **4.5:1 minimum** ; **7:1** pour un titre en grande taille sur photo.
- `#1E6FD8` sur `#0A1A2F` : contraste insuffisant pour du texte courant → utiliser
  `#4A93F0` pour tout texte bleu sur fond sombre.
- `#7A8BA0` uniquement sur fond clair, jamais sur bleu nuit.

## Interdits

- Jaune ou doré en couleur dominante
- Vert, rouge, violet, rose, turquoise
- Dégradés multicolores ou arc-en-ciel
- Néons, fluos, couleurs saturées « réseaux sociaux »
- Noir pur `#000000` en aplat de fond (utiliser `#0A1A2F`)
- Reprendre l'orange du pelage comme couleur d'interface

---

**Note de cohérence :** le site web utilise actuellement un accent doré `#c9a227`
(`tailwind.config.ts`, classe `accent`). Cette teinte est **hors palette** de la direction
artistique ci-dessus. À arbitrer : soit le site s'aligne sur `#1E6FD8`, soit le doré est
formellement réservé au web et exclu de tout visuel social. En l'état, aucun visuel
Instagram ni aucune présentation Canva ne doit l'employer.
