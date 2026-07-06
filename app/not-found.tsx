import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="section text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Erreur 404</p>
      <h1 className="mt-3 text-4xl font-bold text-slate-900">Page introuvable</h1>
      <p className="mx-auto mt-4 max-w-2xl text-slate-600">
        La page demandée n'existe pas ou a été déplacée. Vous pouvez revenir à l'accueil ou
        demander directement une estimation.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-secondary">
          Retour à l'accueil
        </Link>
        <Link href="/devis" className="btn-primary">
          Demander un devis
        </Link>
      </div>
    </section>
  );
}
