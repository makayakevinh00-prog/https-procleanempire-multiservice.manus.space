export type ZoneDepartment = {
  department: string;
  code: string;
  cities: string[];
};

export const zonesPageContent = {
  eyebrow: "Zones d'intervention",
  title: "Nos zones d'intervention en Île-de-France",
  description:
    "ProClean Empire intervient sur l'ensemble de l'Île-de-France, avec une organisation dédiée par secteur pour garantir des délais d'intervention maîtrisés."
};

export const zoneDepartments: ZoneDepartment[] = [
  {
    department: "Val-d'Oise",
    code: "95",
    cities: ["Cergy", "Pontoise", "Argenteuil", "Sarcelles", "Franconville", "Taverny"]
  },
  {
    department: "Hauts-de-Seine",
    code: "92",
    cities: ["Nanterre", "Courbevoie", "La Défense", "Boulogne-Billancourt", "Issy-les-Moulineaux"]
  },
  {
    department: "Yvelines",
    code: "78",
    cities: ["Versailles", "Saint-Germain-en-Laye", "Poissy", "Montigny-le-Bretonneux"]
  },
  {
    department: "Seine-Saint-Denis",
    code: "93",
    cities: ["Saint-Denis", "Aubervilliers", "Montreuil", "Bobigny"]
  },
  {
    department: "Val-de-Marne",
    code: "94",
    cities: ["Créteil", "Vincennes", "Ivry-sur-Seine", "Vitry-sur-Seine"]
  },
  {
    department: "Essonne",
    code: "91",
    cities: ["Évry-Courcouronnes", "Massy", "Palaiseau", "Les Ulis"]
  },
  {
    department: "Seine-et-Marne",
    code: "77",
    cities: ["Meaux", "Melun", "Chelles", "Serris", "Marne-la-Vallée"]
  },
  {
    department: "Paris",
    code: "75",
    cities: ["Tous les arrondissements"]
  }
];
