import { PremiumService } from "@/components/pages/premium-service";
import { buildMetadata, siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Nettoyage de bureaux et commerces à Pontoise, Cergy et en Île-de-France",
  description:
    "Nettoyage de bureaux, commerces, boutiques et halls d'immeuble à Pontoise, Cergy et en Île-de-France : passages réguliers à vos horaires, produits professionnels, un interlocuteur unique. Devis sous 24h.",
  path: "/nettoyage-bureaux"
});

export default function OfficeCleaningPage() {
  return (
    <PremiumService
      eyebrow="Bureaux · Commerces · Halls d'immeuble"
      title="Des locaux impeccables, sans y penser."
      lead="Bureaux, boutiques, cabinets et parties communes : nous entretenons vos locaux à la fréquence et aux horaires qui conviennent à votre activité, pour que vos équipes et vos clients entrent dans un lieu net, chaque jour."
      image={{ src: "/media/photos/hero-showcase.webp", alt: "Espace de bureaux haut de gamme entretenu par ProClean Empire" }}
      serviceId="bureaux"
      ctaLabel="Demander un devis pour mes locaux"
      intro={[
        { title: "À vos horaires", text: "Tôt le matin, en journée ou après la fermeture : nous intervenons sans gêner votre activité." },
        { title: "Toujours la même exigence", text: "Une liste de tâches définie ensemble, contrôlée à chaque passage." },
        { title: "Un seul interlocuteur", text: "Une question, un ajustement, un imprévu : vous savez qui appeler." }
      ]}
      blocks={[
        {
          heading: "Ce que nous entretenons.",
          items: [
            { title: "Bureaux et open spaces", text: "Postes de travail, sols, poubelles, points de contact (poignées, interrupteurs)." },
            { title: "Sanitaires", text: "Nettoyage et désinfection, réassort papier et savon si vous le souhaitez." },
            { title: "Cuisine et espace pause", text: "Plans de travail, évier, électroménager, tables et chaises." },
            { title: "Boutiques et commerces", text: "Surface de vente, vitrine côté intérieur, cabine, comptoir et réserve." },
            { title: "Halls et parties communes", text: "Entrée, escaliers, ascenseur, miroirs et boîtes aux lettres." },
            { title: "Remise en état", text: "Après travaux, déménagement ou avant une ouverture : un grand nettoyage ponctuel." }
          ]
        },
        {
          heading: "Pourquoi les entreprises nous choisissent.",
          items: [
            { title: "Fréquence sur mesure", text: "Quotidien, plusieurs fois par semaine ou ponctuel : vous choisissez." },
            { title: "Produits professionnels", text: "Matériel et produits adaptés à chaque surface, fournis par nos soins." },
            { title: "Facture mensuelle", text: "Pour les contrats réguliers, une seule facture claire chaque mois." },
            { title: "Conciergerie en plus", text: "Déco des fêtes, plantes, consommables : voir notre conciergerie d'entreprise." }
          ]
        }
      ]}
      steps={[
        { title: "Vous décrivez vos locaux", text: "Type de lieu, surface, fréquence et horaires : deux minutes avec le formulaire." },
        { title: "Nous visitons si besoin", text: "Pour les grands espaces, un passage sur place permet un devis juste." },
        { title: "Nous démarrons", text: "Aux jours et horaires convenus, avec un contrôle régulier du résultat." }
      ]}
      faq={[
        { question: "Intervenez-vous en dehors des heures d'ouverture ?", answer: "Oui, tôt le matin ou après la fermeture, selon ce qui convient à votre activité." },
        { question: "Faut-il un contrat longue durée ?", answer: "Non. Nous proposons des passages réguliers comme des interventions ponctuelles." },
        { question: "Fournissez-vous les produits et le matériel ?", answer: "Oui, nous venons avec nos produits et notre matériel professionnels." },
        { question: "Quelles villes couvrez-vous ?", answer: "Pontoise, Cergy et le Val-d'Oise, Paris, Saint-Ouen et toute l'Île-de-France." },
        { question: "Pouvez-vous aussi gérer la décoration ou les plantes ?", answer: "Oui, c'est notre service de conciergerie d'entreprise, sur mesure." }
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: "Nettoyage de bureaux et commerces",
        name: "Nettoyage de bureaux et commerces",
        provider: { "@type": "LocalBusiness", name: siteConfig.name, telephone: siteConfig.phone, url: siteConfig.url },
        areaServed: ["Pontoise", "Cergy", "Val-d'Oise", "Paris", "Saint-Ouen", "Île-de-France"],
        url: `${siteConfig.url}/nettoyage-bureaux`
      }}
    />
  );
}
