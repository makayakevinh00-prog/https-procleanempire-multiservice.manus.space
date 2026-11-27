import Link from "next/link";
import { Reveal } from "@/components/home/reveal";
import { H2, LABEL } from "@/components/landing/ui";

const A = "font-semibold text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink";

/** Présentation rédigée de l'entreprise (texte de référence pour les moteurs de recherche). */
export function SeoText() {
  return (
    <section className="border-t border-slate-200 bg-white" aria-labelledby="entreprise-nettoyage">
      <div className="mx-auto grid max-w-[1680px] gap-12 px-6 py-24 md:px-12 md:py-36 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-5">
          <p className={`${LABEL} text-[#667085]`}>Qui nous sommes</p>
          <h2 id="entreprise-nettoyage" className={`${H2} mt-6`}>
            Votre entreprise de nettoyage <em>dans le Val-d&apos;Oise et à Paris</em>
          </h2>
        </Reveal>
        <div className="space-y-6 text-lg leading-relaxed text-[#475467] lg:col-span-6 lg:col-start-7">
          <p>
            ProClean Empire est une entreprise de nettoyage installée à Pontoise, au cœur du Val-d&apos;Oise. Nous entretenons les bureaux, les commerces, les halls d&apos;immeuble et les logements en location courte durée, avec un interlocuteur unique du devis jusqu&apos;au suivi des passages. Notre siège est à Pontoise : c&apos;est là que nous sommes le plus réactifs, et c&apos;est de là que nous rayonnons sur toute l&apos;Île-de-France.
          </p>
          <p>
            Pour les professionnels, nous assurons le{" "}
            <Link href="/nettoyage-bureaux" className={A}>nettoyage de bureaux et de commerces</Link>{" "}
            à la fréquence de votre choix : un passage par semaine, plusieurs passages ou un entretien quotidien, tôt le matin ou après la fermeture pour ne pas gêner vos équipes. Nous réalisons aussi la remise en état de locaux après travaux, avant une mise en location ou à la fin d&apos;un bail, ainsi que l&apos;entretien des vitres et vitrines.
          </p>
          <p>
            Pour les conciergeries et les propriétaires, notre{" "}
            <Link href="/menage-airbnb" className={A}>ménage Airbnb</Link> prépare le logement entre deux voyageurs, le jour fixé par vos réservations : lits, salle de bain, cuisine, sols, linge et contrôle final avant l&apos;arrivée suivante.
          </p>
          <p>
            Nous intervenons à <Link href="/nettoyage-pontoise" className={A}>Pontoise</Link>, à{" "}
            <Link href="/entreprise-de-nettoyage-cergy" className={A}>Cergy</Link> et dans toute l&apos;agglomération (Osny, Saint-Ouen-l&apos;Aumône, Éragny, Herblay), en Seine-Saint-Denis et à{" "}
            <Link href="/nettoyage-paris" className={A}>Paris</Link>, dans tous les arrondissements. Chaque demande reçoit un devis clair sous 24 heures, sans engagement, avant toute intervention. Vous savez ce qui sera fait, quand et à quel prix.
          </p>
        </div>
      </div>
    </section>
  );
}
