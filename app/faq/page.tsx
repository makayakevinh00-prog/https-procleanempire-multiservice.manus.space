import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { FaqAdvanced } from "@/components/phase3/faq-advanced";
import { faqs } from "@/lib/data";

export const metadata = buildMetadata({
  title: "FAQ nettoyage à Pontoise et dans le Val-d'Oise",
  description:
    "Devis, horaires, produits, contrats, zones d'intervention : les réponses aux questions fréquentes sur nos prestations de nettoyage à Pontoise, Cergy et en Île-de-France.",
  path: "/faq"
});

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer }
  }))
};

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <PageHero
        title="FAQ"
        description="Toutes les informations utiles pour cadrer votre projet de prestations de propreté."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "FAQ" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Poser une question
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <FaqAdvanced />
      </section>
    </>
  );
}
