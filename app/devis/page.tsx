import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { QuoteForm } from "@/components/forms/quote-form";

export const metadata = buildMetadata({
  title: "Demande de devis",
  description:
    "Demandez un devis pour vos prestations de propreté : bureaux, commerces, hôtels ou restaurants en Île-de-France.",
  path: "/devis"
});

export default function QuotePage() {
  return (
    <>
      <PageHero
        title="Demander un devis"
        description="Décrivez vos besoins et recevez une proposition claire, adaptée à vos locaux et à votre rythme d'exploitation."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Devis" }
        ]}
        actions={
          <Link href="/contact" className="btn-secondary">
            Préférer un rappel téléphonique
          </Link>
        }
      />
      <section className="section pt-0">
        <QuoteForm />
      </section>
    </>
  );
}
