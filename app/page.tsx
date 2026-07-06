import Link from "next/link";
import { buildMetadata, siteConfig } from "@/lib/site";
import { services } from "@/lib/data";
import { SectionHeading } from "@/components/sections/section-heading";
import { TrustProofGrid } from "@/components/sections/trust-proof-grid";
import { ServiceCard } from "@/components/sections/service-card";
import { MethodTimeline } from "@/components/sections/method-timeline";
import { CtaBand } from "@/components/sections/cta-band";
import { FaqList } from "@/components/sections/faq-list";
import { VisualPlaceholder } from "@/components/ui/visual-placeholder";

export const metadata = buildMetadata({
  title: "Le partenaire propreté des entreprises ambitieuses",
  description:
    "Externalisez l'entretien de vos locaux avec une équipe réactive, un interlocuteur unique et un suivi qualité régulier.",
  path: "/"
});

export default function HomePage() {
  return (
    <>
      <section className="section grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            {siteConfig.responseDelay}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
            Le partenaire propreté des entreprises ambitieuses
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Nous accompagnons les entreprises dans l&apos;entretien quotidien de leurs
            bureaux, commerces et établissements professionnels.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/devis" className="btn-primary">
              Obtenir un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Être rappelé
            </Link>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-700">
            70+ clients actifs · 4,9/5 sur Google · RC Professionnelle
          </p>
        </div>
        <VisualPlaceholder label="PHOTO ÉQUIPE" ratio="wide" />
      </section>

      <section className="section pt-0">
        <SectionHeading
          eyebrow="Preuves de confiance"
          title="Des indicateurs concrets pour décider sereinement"
          description="Nous mettons en avant des preuves mesurables plutôt que des promesses vagues."
        />
        <div className="mt-10">
          <TrustProofGrid />
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow="Pourquoi choisir ProClean Empire ?"
          title="L'agilité d'une structure à taille humaine, avec une organisation professionnelle"
          description="Un interlocuteur unique, des décisions rapides, des contrats flexibles et un suivi personnalisé pour réduire votre charge de gestion."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            "Interlocuteur unique du devis au suivi",
            "Aucune sous-traitance en cascade",
            "Intervention sous 24 à 48h en Île-de-France",
            "Pilotage multi-sites avec reporting simplifié",
            "Adaptation rapide à vos contraintes internes",
            "Entreprise stable et impliquée dans la durée"
          ].map((item) => (
            <article key={item} className="card p-5 text-sm font-medium text-slate-700">
              {item}
            </article>
          ))}
        </div>
      </section>

      <section className="section bg-slate-50">
        <SectionHeading
          eyebrow="Nos services"
          title="Des prestations conçues pour les besoins réels des entreprises"
          description="Chaque service cible un résultat business: image professionnelle, continuité d'exploitation et gain de temps."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
        <div className="mt-8">
          <Link href="/services" className="btn-secondary">
            Voir tous les services
          </Link>
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow="Notre méthode"
          title="Un processus clair pour sécuriser la qualité dans le temps"
          description="Chaque étape réduit un risque opérationnel: oubli, variabilité, manque de suivi ou absence de contrôle."
        />
        <MethodTimeline />
      </section>

      <section className="section bg-slate-50">
        <SectionHeading
          eyebrow="Visuels à personnaliser"
          title="Espaces réservés pour vos photos réelles"
          description="Nous avons prévu des emplacements dédiés pour remplacer facilement les visuels sans toucher au code."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <VisualPlaceholder label="PHOTO CLIENT À INSÉRER" />
          <VisualPlaceholder label="PHOTO BUREAUX" />
          <VisualPlaceholder label="PHOTO HÔTEL" />
          <VisualPlaceholder label="PHOTO RESTAURANT" />
          <VisualPlaceholder label="PHOTO VITRERIE" />
          <VisualPlaceholder label="PHOTO AVANT/APRÈS" />
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow="FAQ"
          title="Les réponses aux questions que se posent les dirigeants"
          description="Objectif: lever les objections principales avant même le premier échange."
        />
        <FaqList />
      </section>

      <CtaBand />
    </>
  );
}
