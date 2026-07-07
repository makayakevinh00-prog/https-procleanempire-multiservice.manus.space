import Link from "next/link";
import { VisualPlaceholder } from "@/components/ui/visual-placeholder";
import type { Service } from "@/lib/data";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <VisualPlaceholder label={`PHOTO ${service.title.toUpperCase()}`} ratio="wide" />
      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-xl font-semibold text-slate-900">{service.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{service.shortDescription}</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {service.benefits.slice(0, 3).map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span aria-hidden className="text-brand-700">
                ✓
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/services/${service.slug}`} className="btn-secondary">
            Voir le détail
          </Link>
          <Link href="/devis" className="btn-primary">
            Demander un devis
          </Link>
        </div>
      </div>
    </article>
  );
}
