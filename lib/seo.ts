/**
 * Titres de page pour Google : mot-clé et zone en tête, 60 caractères au plus (Google coupe au-delà), sans répéter le nom de l'entreprise
 * quand il fait dépasser la limite. Ciblage : Paris (75) et Val-d'Oise (95), avec Pontoise et Cergy en premier.
 * Pour changer le titre d'une page, modifier ici : la page, Open Graph et Twitter suivent.
 */
export const TITLE_OVERRIDES: Record<string, string> = {
  "/": "Entreprise de nettoyage à Cergy-Pontoise (95) et Paris",
  "/nettoyage-paris": "Entreprise de nettoyage à Paris – Bureaux, commerces",
  "/entreprise-de-nettoyage-paris-16": "Entreprise de nettoyage Paris 16e – Bureaux, cabinets",
  "/menage-airbnb-paris": "Ménage Airbnb à Paris – Check-out entre deux voyageurs",
  "/menage-airbnb": "Ménage Airbnb à Paris – Entre deux voyageurs",
  "/nettoyage-pontoise": "Entreprise de nettoyage à Pontoise (95) – Devis 24 h",
  "/nettoyage-bureaux-pontoise": "Nettoyage de bureaux à Pontoise (95300) – Devis gratuit",
  "/nettoyage-cergy": "Nettoyage de bureaux et commerces à Cergy (95)",
  "/entreprise-de-nettoyage-cergy": "Entreprise de nettoyage à Cergy-Pontoise – Devis 24 h",
  "/lavage-auto-domicile-cergy-pontoise": "Lavage auto à domicile à Cergy-Pontoise (95)",
  "/nettoyage-bureaux": "Nettoyage de bureaux et commerces – Val-d'Oise et Paris",
  "/nettoyage-commerces": "Nettoyage de commerces et boutiques – 95 et Paris",
  "/nettoyage-hotels": "Nettoyage d'hôtels – Val-d'Oise (95) et Paris",
  "/nettoyage-restaurants": "Nettoyage de restaurants – Val-d'Oise (95) et Paris",
  "/nettoyage-vitrerie": "Nettoyage de vitres et vitrines – Val-d'Oise et Paris",
  "/nettoyage-automobile": "Nettoyage automobile et detailing – Pontoise et Paris",
  "/remise-en-etat": "Remise en état et grand nettoyage – Val-d'Oise et Paris",
  "/apres-chantier": "Nettoyage après travaux – Pontoise, Val-d'Oise, Paris",
  "/conciergerie-entreprise": "Conciergerie d'entreprise dans le Val-d'Oise (95)",
  "/services": "Nos services de nettoyage – Val-d'Oise et Paris",
  "/services/desinfection": "Désinfection et traitement sanitaire – 95 et Paris",
  "/services/entretien-regulier": "Contrat d'entretien régulier – Val-d'Oise et Paris",
  "/services/parties-communes": "Entretien des parties communes – Val-d'Oise et Paris",
  "/zones-intervention": "Zones d'intervention – Val-d'Oise (95) et Paris (75)",
  "/devis": "Devis de nettoyage gratuit – Val-d'Oise et Paris",
  "/contact": "Contact et devis de nettoyage – Pontoise (95)",
  "/a-propos": "À propos de ProClean Empire – Nettoyage à Pontoise",
  "/equipe": "L'équipe de nettoyage ProClean Empire – Pontoise",
  "/faq": "FAQ nettoyage – Pontoise et Val-d'Oise",
  "/galerie": "Photos de nos chantiers de nettoyage – 95 et Paris",
  "/realisations": "Réalisations de nettoyage – Val-d'Oise et Paris",
  "/videos": "Vidéos de nos interventions de nettoyage – 95 et Paris",
  "/blog": "Blog nettoyage : conseils bureaux, Airbnb, locaux",
  "/proprietaires": "Propriétaires : gestion et ménage de votre bien (95)",
  "/blog/decoration-noel-bureaux-commerces-val-doise": "Décorer bureaux et boutique pour Noël – Val-d'Oise",
  "/blog/menage-airbnb-paris-entre-deux-voyageurs": "Ménage Airbnb à Paris : entre deux voyageurs",
  "/blog/nettoyage-bureaux-cergy-pontoise-frequence": "Nettoyage de bureaux à Cergy-Pontoise : quelle fréquence ?",
  "/entreprise-de-nettoyage-seine-saint-denis": "Entreprise de nettoyage en Seine-Saint-Denis (93)",
  "/nettoyage-saint-ouen": "Ménage Airbnb et nettoyage à Saint-Ouen (93)",
  "/nettoyage-osny": "Entreprise de nettoyage à Osny (95520) – Devis 24 h",
  "/nettoyage-saint-ouen-l-aumone": "Nettoyage à Saint-Ouen-l'Aumône (95310) – Bureaux",
  "/nettoyage-eragny": "Entreprise de nettoyage à Éragny (95610) – Devis 24 h",
  "/nettoyage-vaureal": "Entreprise de nettoyage à Vauréal (95490) – Devis 24 h",
  "/nettoyage-jouy-le-moutier": "Nettoyage à Jouy-le-Moutier (95280) – Bureaux, commerces"
};

export const TITLE_MAX = 62;
