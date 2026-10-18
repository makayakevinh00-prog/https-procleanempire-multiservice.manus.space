import Link from "next/link";
import { PremiumService } from "@/components/pages/premium-service";
import { buildMetadata, siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Ménage Airbnb dans le Val-d'Oise (95) – Pontoise, Cergy, Paris",
  description:
    "Ménage Airbnb entre deux voyageurs à Pontoise, Cergy, Paris et en Île-de-France : passage entre 11h et 14h le jour que vous fixez, checklist complète, linge en option. Devis sous 24h.",
  path: "/menage-airbnb"
});

export default function MenageAirbnbPage() {
  return (
    <PremiumService
      eyebrow="Ménage Airbnb · Location courte durée"
      title="Ménage Airbnb dans le Val-d'Oise (95) : un logement prêt pour chaque voyageur."
      lead="Pour les conciergeries et les propriétaires : nous préparons votre logement entre le départ et l'arrivée, le jour que vous fixez, avec le même niveau d'exigence à chaque passage."
      image={{ src: "/media/photos/airbnb-salon-table-basse.webp", alt: "Salon d'un logement Airbnb préparé pour l'arrivée des voyageurs" }}
      serviceId="airbnb"
      ctaLabel="Demander un devis pour mon Airbnb"
      intro={[
        { title: "Le jour, c'est vous qui le fixez", text: "Votre calendrier de réservations fait foi : nous ne déplaçons jamais un ménage, même un lundi ou un week-end." },
        { title: "Passage entre 11h et 14h", text: "Le créneau classique entre le départ d'un voyageur et l'arrivée du suivant." },
        { title: "Un seul interlocuteur", text: "Vous savez qui intervient, et vous êtes prévenu au moindre imprévu dans le logement." }
      ]}
      blocks={[
        {
          heading: "Notre checklist à chaque passage.",
          items: [
            { title: "Chambres", text: "Lits refaits, draps changés, poussière, sols et dessous de lit." },
            { title: "Salle de bain", text: "Douche, lavabo, WC et miroirs désinfectés, serviettes remplacées." },
            { title: "Cuisine", text: "Plans de travail, plaques, évier, électroménager et vaisselle vérifiés." },
            { title: "Pièces de vie", text: "Sols aspirés et lavés, surfaces dépoussiérées, coussins et déco remis en place." },
            { title: "Petits consommables", text: "Papier toilette, savon, sacs poubelle : contrôle et réassort si vous le souhaitez." },
            { title: "Contrôle final", text: "Tour complet du logement avant de partir pour un accueil sans mauvaise surprise." }
          ]
        },
        {
          heading: "Nos villes dans le Val-d'Oise (95) et au-delà.",
          items: [
            { title: "Pontoise", text: "Notre siège : les créneaux de ménage entre deux voyageurs y sont les plus faciles à caler." },
            { title: "Cergy et Osny", text: "Studios étudiants, appartements meublés et maisons de l'agglomération de Cergy-Pontoise." },
            { title: "Saint-Ouen-l'Aumône", text: "Logements en location courte durée de l'autre côté de l'Oise, à quelques minutes de notre base." },
            { title: "Goussainville et l'est du 95", text: "Logements proches de l'aéroport de Roissy, très demandés par les voyageurs de passage." },
            { title: "Paris et Saint-Ouen", text: "Ménage de fin de séjour à Paris (17e, 18e, 20e) et à Saint-Ouen-sur-Seine : voir notre page Paris." }
          ]
        },
        {
          heading: "Ce qui change pour vous.",
          items: [
            { title: "Linge en option", text: "Vous fournissez le linge, ou nous en discutons pour l'organiser avec vous." },
            { title: "Imprévus signalés", text: "Casse, objet oublié, logement très sale : nous vous alertons tout de suite." },
            { title: "Conciergeries", text: "Plusieurs logements ? Un planning commun et une facture mensuelle unique." }
          ]
        }
      ]}
      steps={[
        { title: "Vous décrivez le logement", text: "Type, surface, couchages, linge et fréquence : deux minutes avec le formulaire." },
        { title: "Nous confirmons le prix", text: "Devis clair sous 24h, avant toute intervention." },
        { title: "Nous intervenons", text: "Aux dates de vos réservations, entre 11h et 14h, et nous contrôlons le résultat." }
      ]}
      faq={[
        { question: "Intervenez-vous le week-end et les jours fériés ?", answer: "Oui : le ménage suit vos réservations, quel que soit le jour." },
        { question: "Comment se passe la remise des clés ?", answer: "Boîte à clés, digicode ou remise en main propre : nous nous adaptons à votre organisation." },
        { question: "Fournissez-vous les produits et le matériel ?", answer: "Oui, nous venons avec nos produits et notre matériel professionnels." },
        { question: "Quelles villes couvrez-vous ?", answer: "Pontoise, Cergy et le Val-d'Oise, Paris et l'Île-de-France. Demandez-nous pour votre adresse exacte." },
        { question: "Comment est facturé le ménage ?", answer: "Au passage, avec une facture mensuelle pour les conciergeries et propriétaires réguliers." }
      ]}
      aside={
        <section className="bg-white">
          <div className="mx-auto max-w-[1200px] px-5 pb-20 md:px-8 md:pb-28">
            <h2 className="text-2xl font-bold text-ink">Ménage Airbnb près de chez vous</h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {[
                { href: "/nettoyage-pontoise", label: "Pontoise" },
                { href: "/nettoyage-cergy", label: "Cergy" },
                { href: "/menage-airbnb-paris", label: "Ménage fin de séjour à Paris" },
                { href: "/nettoyage-saint-ouen", label: "Saint-Ouen-sur-Seine" }
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="btn-pill-ghost text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      }
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: "Ménage Airbnb / location courte durée",
        name: "Ménage Airbnb",
        provider: { "@type": "LocalBusiness", name: siteConfig.name, telephone: siteConfig.phone, url: siteConfig.url },
        areaServed: ["Pontoise", "Cergy", "Osny", "Saint-Ouen-l'Aumône", "Goussainville", "Val-d'Oise", "Paris", "Saint-Ouen-sur-Seine", "Île-de-France"],
        url: `${siteConfig.url}/menage-airbnb`
      }}
    />
  );
}
