import { PremiumService } from "@/components/pages/premium-service";
import { buildMetadata, siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Conciergerie d'entreprise dans le Val-d'Oise – Cergy, Pontoise, Roissy",
  description:
    "Conciergerie d'entreprise pour bureaux et commerces dans le Val-d'Oise (Cergy, Pontoise, Roissy) et en Île-de-France : décoration de Noël, nettoyage quotidien, entretien des équipements, véhicules de société, décoration des fêtes, consommables, plantes et accueil.",
  path: "/conciergerie-entreprise"
});

export default function ConciergerieEntreprisePage() {
  return (
    <PremiumService
      eyebrow="Conciergerie d'entreprise · Bureaux & commerces"
      title="Vos espaces de travail, entièrement pris en charge."
      lead="Un seul prestataire pour la propreté, l'entretien et la vie quotidienne de vos locaux. Vos équipes et vos clients trouvent un lieu impeccable chaque matin, vous n'y pensez plus."
      image={{ src: "/media/photos/hero-showcase.webp", alt: "Espace de bureaux haut de gamme entretenu par ProClean Empire" }}
      serviceId="conciergerie"
      ctaLabel="Demander un devis conciergerie"
      intro={[
        { title: "Sur mesure", text: "Vous choisissez les services utiles à vos locaux, nous construisons le planning autour." },
        { title: "Interlocuteur unique", text: "Une seule personne à appeler pour la propreté, le réassort, la déco ou un petit service." },
        { title: "Un contrat, une facture", text: "Tout est regroupé dans une facture mensuelle claire." }
      ]}
      blocks={[
        {
          heading: "Ce que nous prenons en charge.",
          items: [
            { title: "Entretien · Nettoyage quotidien", text: "Bureaux, sanitaires, cuisines et espaces d'accueil, avant l'arrivée de vos équipes." },
            { title: "Entretien · Équipements", text: "Postes de travail, électroménager, vitrines, sols et mobilier." },
            { title: "Entretien · Véhicules de société", text: "Voitures, utilitaires et même avions : nettoyage intérieur et extérieur sur site." },
            { title: "Accueil · Petits services", text: "Réception des livraisons, préparation des salles de réunion, petites interventions." },
            { title: "Logistique · Consommables & réassort", text: "Papier, savon, café, produits d'entretien : jamais en rupture." },
            { title: "Logistique · Plantes", text: "Arrosage, entretien et remplacement des plantes de vos locaux." },
            { title: "Services ponctuels · Décoration des fêtes", text: "Halloween, Noël, Saint-Valentin, Pâques : installée puis retirée par nos soins." },
            { title: "Services ponctuels · Remise en état", text: "Après travaux, déménagement ou événement, vos locaux retrouvent leur état d'origine." }
          ]
        },
        {
          heading: "Décoration de Noël pour bureaux et commerces.",
          items: [
            { title: "Vitrines et boutiques", text: "Une vitrine de fêtes qui attire l'œil dans la rue ou la galerie marchande, installée en dehors de vos heures d'ouverture." },
            { title: "Accueil et open spaces", text: "Sapin, guirlandes et décor d'accueil pour recevoir clients et équipes dans une ambiance de fêtes." },
            { title: "Pose, entretien, dépose", text: "Nous installons début décembre, vérifions le décor pendant les fêtes et retirons tout en janvier." },
            { title: "Toute l'année", text: "Le même service pour Halloween, la Saint-Valentin ou Pâques, selon le calendrier de votre commerce." }
          ]
        }
      ]}
      steps={[
        { title: "Vous nous décrivez vos locaux", text: "Surface, effectif et services souhaités, en deux minutes." },
        { title: "Nous vous proposons un contrat", text: "Une visite si besoin, puis une proposition claire sous 24h." },
        { title: "Nous gérons au quotidien", text: "Planning convenu, contrôles réguliers et un interlocuteur qui ajuste dès que vos besoins évoluent." }
      ]}
      faq={[
        { question: "Peut-on commencer par le nettoyage seul ?", answer: "Oui. Vous pouvez ajouter les autres services quand vous le souhaitez." },
        { question: "Intervenez-vous en dehors des horaires de bureau ?", answer: "Oui : tôt le matin, en soirée ou le week-end, selon votre activité." },
        { question: "Nettoyez-vous les véhicules sur place ?", answer: "Oui, sur votre parking ou votre site, pour les voitures, utilitaires et avions." },
        { question: "Quand commander la décoration de Noël ?", answer: "Le plus tôt possible, idéalement avant mi-novembre, pour une pose début décembre." },
        { question: "Quelles zones couvrez-vous ?", answer: "Cergy, Pontoise, Roissy et tout le Val-d'Oise, Paris et l'Île-de-France." }
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: "Conciergerie d'entreprise",
        name: "Conciergerie d'entreprise",
        provider: { "@type": "LocalBusiness", name: siteConfig.name, telephone: siteConfig.phone, url: siteConfig.url },
        areaServed: ["Cergy", "Pontoise", "Roissy-en-France", "Val-d'Oise", "Paris", "Île-de-France"],
        url: `${siteConfig.url}/conciergerie-entreprise`
      }}
    />
  );
}
