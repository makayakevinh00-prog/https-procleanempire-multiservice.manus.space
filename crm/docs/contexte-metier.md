# Contexte métier ProClean Empire (à garder pour compléter le CRM)

Source : indications du dirigeant, 5 novembre 2026. À tenir à jour.

## Clients sous contrat
| Client | Condition | État |
|---|---|---|
| SEA | 600 € HT / mois | contrat actif |
| Île-de-France Recyclage | 300 € HT / mois | contrat actif |
| SARB Optique | 564 € TTC / mois (470 € HT) | contrat actif |
| Hélène Despic / Easy Stay (conciergerie Lyon) | ménage Airbnb à la prestation, depuis le 15/09/2026 | voir point ouvert ci-dessous |
| Ahmed El Youssfi (Paris 16e) | 9 % de gestion + forfait ménage 155 € TTC / séjour, révision en décembre | actif, **contact réservé** |
| Concierg'Air | contrat résilié en octobre 2026 | **ne plus inclure dans les rapports, ne plus relancer** |

## Règles de facturation
- Factures des contrats : le **27 de chaque mois**.
- Factures des conciergeries : **par passage**, générées automatiquement depuis le planning.
- Validation manuelle des factures ; confirmation au-dessus de 1 500 € HT.
- Axonaut est résilié depuis fin octobre 2026 : ce CRM est le seul outil.

## Équipe
- Agent de ménage : Esma Nouali (fiche créée dans Équipe).

## Déploiement
- Projet Vercel du CRM : `prj_3S9lAhspu3wpzKtS69u08YKSN1cL` (proclean-crm.vercel.app).
- Si les outils MCP Vercel expirent : passer par l'API Vercel directement.
- Éviter d'empiler les déploiements : la file Vercel se bloque (annuler les anciens).

## Points ouverts
- Le CRM génère aujourd'hui les factures de contrat en **fin de mois** : à caler sur le 27.
- Hélène Despic : fiche et contrat marqués « résilié » (fin 12/10/2026) dans le CRM, alors que la liste ci-dessus la compte sous contrat.
