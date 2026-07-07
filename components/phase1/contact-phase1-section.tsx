import Link from "next/link";
import { phase1Contact } from "@/lib/content/phase1";

export function ContactPhase1Section() {
  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr,1.1fr] lg:items-start">
          <article>
            <h2 className="text-3xl font-bold text-[#14213d] md:text-4xl">{phase1Contact.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">{phase1Contact.description}</p>
            <dl className="mt-7 space-y-3 text-sm text-slate-700">
              <div>
                <dt className="font-semibold text-[#14213d]">Adresse</dt>
                <dd>{phase1Contact.address}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#14213d]">Téléphone</dt>
                <dd>
                  <a href={phase1Contact.phoneHref} className="underline">
                    {phase1Contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#14213d]">Email</dt>
                <dd>{phase1Contact.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#14213d]">Zone d&apos;intervention</dt>
                <dd>{phase1Contact.zone}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#14213d]">Horaires</dt>
                <dd>{phase1Contact.hours}</dd>
              </div>
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/devis" className="btn-primary">
                Demander un devis
              </Link>
              <Link href={phase1Contact.directContactCta.href} className="btn-secondary">
                {phase1Contact.directContactCta.label}
              </Link>
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl border border-slate-200">
            <iframe
              title="Carte Google Maps ProClean Empire"
              src={phase1Contact.mapsEmbedUrl}
              className="h-[420px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </article>
        </div>
      </div>
    </section>
  );
}
