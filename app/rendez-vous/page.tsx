import Link from "next/link";
import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { AxonautBooking, AXONAUT_BOOKING_URL } from "@/components/booking/axonaut-booking";

export const metadata = buildMetadata({
  title: "Prendre rendez-vous : appel, visite technique ou devis",
  description:
    "Réservez en ligne un appel découverte, une visite technique gratuite ou un rendez-vous devis avec ProClean Empire : ménage Airbnb, bureaux, remise en état en Île-de-France.",
  path: "/rendez-vous"
});

const appointmentTypes = [
  { title: "Appel découverte", duration: "20 min", text: "On fait le point sur votre besoin par téléphone : logement Airbnb, bureaux, commerce ou chantier." },
  { title: "Visite d'évaluation sur place", duration: "45 min", text: "Visite technique gratuite chez vous pour chiffrer précisément la prestation." },
  { title: "Devis nettoyage de bureaux", duration: "45 min", text: "Rendez-vous dans vos locaux pour établir le cahier des charges et le devis." },
  { title: "État des lieux – remise en état / fin de chantier", duration: "60 min", text: "Évaluation du logement ou du chantier avant une remise en état complète." }
];

export default function RendezVousPage() {
  return (
    <>
      <PageHero
        title="Prendre rendez-vous avec ProClean Empire"
        description="Choisissez le créneau qui vous convient : appel découverte, visite technique gratuite ou rendez-vous devis. Confirmation immédiate par e-mail."
        breadcrumbs={[{ label: "Accueil", href: "/" }, { label: "Rendez-vous" }]}
        actions={
          <>
            <a href={siteConfig.phoneHref} className="btn-secondary">
              Ou appelez le {siteConfig.phone}
            </a>
            <Link href="/devis" className="btn-secondary">
              Demande de devis écrite
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {appointmentTypes.map((type) => (
            <article key={type.title} className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">{type.duration}</p>
              <h2 className="mt-1 text-base font-semibold text-[#14213d]">{type.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{type.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section pt-0">
        <div className="card p-2 md:p-4">
          <AxonautBooking />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Le calendrier ne s&apos;affiche pas ?{" "}
          <a href={AXONAUT_BOOKING_URL} target="_blank" rel="noopener noreferrer" className="underline">
            Ouvrir la page de réservation
          </a>
          .
        </p>
      </section>
    </>
  );
}
