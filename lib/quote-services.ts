/** Prestations du formulaire de devis et questions propres à chacune (partagé client / serveur). */
export type QuoteField = {
  key: string;
  label: string;
  type: "select" | "number" | "text" | "multi";
  options?: string[];
  required?: boolean;
};

type ServiceDef = { id: string; label: string; hint: string; fields: QuoteField[] };

const frequencyPro = ["Quotidien", "2 à 3 fois par semaine", "1 fois par semaine", "Ponctuel"];

export const quoteServices: ServiceDef[] = [
  {
    id: "airbnb",
    label: "Ménage Airbnb",
    hint: "Location courte durée, conciergerie",
    fields: [
      { key: "logement", label: "Type de logement", type: "select", options: ["Studio", "T1", "T2", "T3", "T4 et plus", "Maison"], required: true },
      { key: "surface", label: "Surface (m²)", type: "number" },
      { key: "couchages", label: "Nombre de couchages", type: "number" },
      { key: "linge", label: "Linge de lit et serviettes", type: "select", options: ["Je fournis le linge", "À gérer par ProClean Empire", "À discuter"] },
      { key: "frequence", label: "Fréquence", type: "select", options: ["À chaque départ de voyageur", "Plusieurs fois par semaine", "Ponctuel"], required: true }
    ]
  },
  {
    id: "bureaux",
    label: "Bureaux",
    hint: "Entretien régulier de vos locaux",
    fields: [
      { key: "surface", label: "Surface (m²)", type: "number", required: true },
      { key: "frequence", label: "Fréquence", type: "select", options: frequencyPro, required: true },
      { key: "sanitaires", label: "Nombre de sanitaires", type: "number" },
      { key: "vitrerie", label: "Vitrerie à inclure", type: "select", options: ["Oui", "Non", "À discuter"] },
      { key: "horaires", label: "Horaires d'intervention", type: "select", options: ["Tôt le matin", "En journée", "En soirée", "Le week-end"] }
    ]
  },
  {
    id: "commerce",
    label: "Commerce",
    hint: "Boutique, agence, showroom",
    fields: [
      { key: "surface", label: "Surface (m²)", type: "number", required: true },
      { key: "frequence", label: "Fréquence", type: "select", options: frequencyPro, required: true },
      { key: "vitrine", label: "Vitrine à nettoyer", type: "select", options: ["Oui", "Non"] },
      { key: "horaires", label: "Horaires d'intervention", type: "select", options: ["Avant l'ouverture", "Après la fermeture", "Le week-end"] }
    ]
  },
  {
    id: "conciergerie",
    label: "Conciergerie d'entreprise",
    hint: "Gestion complète de vos espaces",
    fields: [
      {
        key: "besoins",
        label: "Ce dont vous avez besoin",
        type: "multi",
        options: [
          "Nettoyage quotidien",
          "Entretien des équipements",
          "Véhicules de société",
          "Décoration des fêtes",
          "Consommables & réassort",
          "Plantes",
          "Accueil & petits services"
        ],
        required: true
      },
      { key: "surface", label: "Surface des locaux (m²)", type: "number" },
      { key: "effectif", label: "Nombre de personnes sur place", type: "number" }
    ]
  },
  {
    id: "remise",
    label: "Remise en état",
    hint: "Fin de chantier, départ de locataire",
    fields: [
      { key: "type", label: "Situation", type: "select", options: ["Fin de chantier", "Départ de locataire", "Grand nettoyage", "Autre"], required: true },
      { key: "surface", label: "Surface (m²)", type: "number", required: true }
    ]
  },
  {
    id: "copropriete",
    label: "Copropriété",
    hint: "Halls et parties communes",
    fields: [
      { key: "batiments", label: "Nombre de bâtiments", type: "number", required: true },
      { key: "parties", label: "Parties communes", type: "text" },
      { key: "passages", label: "Passages par semaine", type: "select", options: ["1", "2", "3", "5 et plus"], required: true }
    ]
  },
  {
    id: "vehicules",
    label: "Véhicules de société",
    hint: "Voitures, utilitaires, avions",
    fields: [
      { key: "vehicule", label: "Type de véhicule", type: "select", options: ["Voiture", "Utilitaire", "Flotte (plusieurs véhicules)", "Avion"], required: true },
      { key: "nombre", label: "Nombre de véhicules", type: "number" },
      { key: "prestation", label: "Prestation", type: "select", options: ["Intérieur", "Extérieur", "Intérieur + extérieur"], required: true }
    ]
  }
];

