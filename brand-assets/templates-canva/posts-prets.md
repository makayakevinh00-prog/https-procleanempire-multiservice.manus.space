# Publications prêtes à produire

Neuf publications formant une **grille complète**, construites à partir des photos déjà
disponibles dans `public/media/photos/`. Chacune raconte quelque chose : aucune n'est
une affiche.

Structure de chaque fiche : rubrique · gabarit · photo · titre · pose de l'Inspecteur.

---

## Ligne 1

### 1 — Photo pleine, sans mascotte
**Rubrique** 🪟 Vitrerie · **Gabarit** A (sans mascotte) · **Photo** *à produire — vitrage en contre-jour*

> Ce n'est pas la vitre qui compte.
> **C'est la lumière qu'elle laisse entrer.**

*Mot en accent : « lumière ». Aucune mascotte — c'est une respiration de grille.*

---

### 2 — Le chiffre de la semaine
**Rubrique** 📊 · **Gabarit** C · **Fond** bleu nuit

> **20 %**
> C'est la lumière naturelle que perd un bureau derrière des vitres non entretenues.

**Mascotte** `presente-paume` — il présente le chiffre, il ne le commente pas.

---

### 3 — Photo + titre
**Rubrique** 🚘 Detailing · **Gabarit** A · **Photo** `interieur-mercedes-apres.jpeg`

> Ce siège n'est pas neuf.
> **Il est simplement entretenu correctement.**

**Mascotte** `regarde-photo` — il regarde le siège, pas l'objectif.

---

## Ligne 2

### 4 — Le conseil de l'Inspecteur
**Rubrique** 💡 · **Gabarit** B · **Fond** clair

> La poussière ne se pose pas au milieu d'une pièce.
> **Elle attend dans les angles.**
>
> *Texte d'appui :* Un sol impeccable au centre et gris sur les plinthes, c'est un sol
> qui n'a pas été nettoyé. Il a été traversé.

**Mascotte** `doigt-leve`

---

### 5 — Avant / après
**Rubrique** ⭐ Inspection validée · **Gabarit** D
**Photos** `cuir-rouge-avant.jpeg` + `cuir-rouge-apres.jpeg`

> *(pas de titre — les deux images parlent)*
> Badges AVANT / APRÈS uniquement.

**Mascotte** `ok-main`

---

### 6 — Photo de détail, sans mascotte
**Rubrique** 👀 L'œil de l'Inspecteur · **Gabarit** A (sans mascotte) · **Photo** `traitement-tapis.jpeg`

> **Personne ne regarde une moquette.**
> Tout le monde la sent.

---

## Ligne 3

### 7 — Photo + titre
**Rubrique** ✈️ Aéronautique · **Gabarit** A · **Photo** `cockpit-avion-detailing.jpeg`

> Dans un cockpit, un détail oublié
> **n'est jamais un détail.**

**Mascotte** `bras-croises`

---

### 8 — Retour client vérifié
**Rubrique** ⭐ · **Gabarit** E · **Fond** bleu nuit

> « On n'a rien remarqué. »
>
> *Auteur :* Office manager · Bureaux, 400 m²
> *Texte d'appui :* C'est le meilleur avis qu'on puisse recevoir.

**Mascotte** `bras-croises`

---

### 9 — Couverture de carrousel
**Rubrique** 💡 · **Gabarit** F · **Fond** bleu nuit

> 7 erreurs que les entreprises commettent avec leurs locaux.

**Mascotte** `salut` · Voir le script complet dans `carrousels.md`.

---

## Vérification de grille

```
┌──────────┬──────────┬──────────┐
│ PHOTO    │ CHIFFRE  │ PHOTO    │
│ vitrerie │ bleu     │ detailing│
│ sans 🦊  │ 🦊       │ 🦊       │
├──────────┼──────────┼──────────┤
│ CONSEIL  │ AVANT/   │ PHOTO    │
│ clair    │ APRÈS    │ tapis    │
│ 🦊       │ 🦊       │ sans 🦊  │
├──────────┼──────────┼──────────┤
│ PHOTO    │ TÉMOIGN. │ CARROUS. │
│ avion    │ bleu     │ bleu     │
│ 🦊       │ 🦊       │ 🦊       │
└──────────┴──────────┴──────────┘
```

- Fonds bleu nuit adjacents : case 8 et case 9 sont côte à côte ⚠️
  → **corriger** en passant la case 8 (témoignage) sur fond clair, ou en intervertissant
  les cases 8 et 7.
- Posts sans mascotte : 2 sur 9 ✅
- Posts à dominante photo : 5 sur 9 ✅
- Aucune rubrique répétée dans une même ligne ✅

## Stories associées

| Story | Rubrique | Mascotte |
|---|---|---|
| Arrivée sur site, 6 h 40 | 📍 Mission du jour | `tablette` |
| Le détail que je vérifie en premier | 👀 L'œil de l'Inspecteur | `loupe-detail` |
| Le Test du Gant Blanc, en direct | ⭐ Inspection validée | `gant-blanc` |
