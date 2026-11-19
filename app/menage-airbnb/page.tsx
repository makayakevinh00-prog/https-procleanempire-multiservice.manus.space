import Link from "next/link";
import { PremiumService } from "@/components/pages/premium-service";
import { buildMetadata, siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Ménage Airbnb à Paris – entre deux voyageurs",
  description:
    "Ménage Airbnb entre deux voyageurs à Paris : passage entre 11h et 14h le jour que vous fixez, checklist complète, linge en option. Devis sous 24 h.",
  path: "/menage-airbnb"
});

export default function MenageAirbnbPage() {
  return (
    <PremiumService
      eyebrow="Ménage Airbnb · Location courte durée"
      title="Ménage Airbnb à Paris : un logement prêt pour chaque voyageur."
      lead="Pour les conciergeries et les propriétaires : nous préparons votre logement entre le départ et l'arrivée, le jour que vous fixez, avec le même niveau d'exigence à chaque passage."
      image={{ src: "/media/photos/landing/appart-chambre-etageres.webp", alt: "Chambre d'un logement Airbnb préparée pour l'arrivée des voyageurs : lit fait, serviettes roulées" }}
      photos={[
        { src: "/media/photos/landing/appart-salon-large.webp", alt: "Grand salon haussmannien lumineux, canapé blanc et table basse en verre" },
        { src: "/media/photos/landing/appart-chambre-fenetres.webp", alt: "Chambre préparée : lit blanc, serviettes roulées, fenêtres sur les arbres" },
        { src: "/media/photos/landing/appart-salle-a-manger.webp", alt: "Salle à manger : table en verre et chaises vertes" },
        { src: "/media/photos/landing/appart-cuisine.webp", alt: "Cuisine blanche ouverte sur le séjour" },
        { src: "/media/photos/landing/appart-chambre-patio.webp", alt: "Seconde chambre : lit blanc et coussins colorés" },
        { src: "/media/photos/landing/appart-terrasse.webp", alt: "Petite terrasse avec deux fauteuils" },
      ]}
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
          heading: "Les plus beaux quartiers de Paris.",
          items: [
            { title: "Trocadéro, Passy et Auteuil (16e)", text: "Appartements familiaux et pied-à-terre face à la tour Eiffel, à deux pas de l'Arc de Triomphe." },
            { title: "Champs-Élysées et Triangle d'or (8e)", text: "Logements haut de gamme entre l'avenue Montaigne, George-V et le parc Monceau." },
            { title: "Tour Eiffel et Invalides (7e)", text: "Appartements du Champ-de-Mars, du Gros-Caillou et du faubourg Saint-Germain." },
            { title: "Saint-Germain-des-Prés et Luxembourg (6e)", text: "Studios et appartements de caractère au cœur de la rive gauche." },
            { title: "Le Marais et les îles (3e, 4e)", text: "Logements de charme entre la place des Vosges, l'île Saint-Louis et l'Hôtel de Ville." },
            { title: "Louvre, Palais-Royal et Opéra (1er, 2e, 9e)", text: "Appartements du centre historique, à quelques pas des grands magasins et des musées." },
            { title: "Monceau, Ternes et Batignolles (17e)", text: "Immeubles haussmanniens de la plaine Monceau et des abords de l'Étoile." }
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
        { title: "Nous confirmons le prix", text: "Devis clair sous 24 h, avant toute intervention." },
        { title: "Nous intervenons", text: "Aux dates de vos réservations, entre 11h et 14h, et nous contrôlons le résultat." }
      ]}
      faq={[
        { question: "Intervenez-vous le week-end et les jours fériés ?", answer: "Oui : le ménage suit vos réservations, quel que soit le jour." },
        { question: "Comment se passe la remise des clés ?", answer: "Boîte à clés, digicode ou remise en main propre : nous nous adaptons à votre organisation." },
        { question: "Fournissez-vous les produits et le matériel ?", answer: "Oui, nous venons avec nos produits et notre matériel professionnels." },
        { question: "Où intervenez-vous ?", answer: "À Paris, dans les quartiers les plus recherchés : 16e, 8e, 7e, 6e, le Marais, le centre historique et le 17e. Demandez-nous pour votre adresse exacte." },
        { question: "Comment est facturé le ménage ?", answer: "Au passage, avec une facture mensuelle pour les conciergeries et propriétaires réguliers." }
      ]}
      aside={
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1680px] px-6 py-16 md:px-12 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-600">Ménage Airbnb à Paris</h2>
            <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
              {[
                { href: "/menage-airbnb-paris", label: "Ménage fin de séjour à Paris" },
                { href: "/entreprise-de-nettoyage-paris-16", label: "Paris 16e" }
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-flex min-h-11 items-center border-b border-ink/40 pb-0.5 text-lg font-semibold text-ink transition-colors hover:border-ink">
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
        areaServed: ["Paris"],
        url: `${siteConfig.url}/menage-airbnb`
      }}
    />
  );
}
