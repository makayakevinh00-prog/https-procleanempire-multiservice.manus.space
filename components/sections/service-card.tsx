import Link from "next/link";
import { Service } from "@/lib/data";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="card flex h-full flex-col p-6">
      <h3 className="text-xl font-semibold text-slate-900">{service.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{service.shortDescription}</p>
      <ul className="mt-5 space-y-2 text-sm text-slate-700">
        {service.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <span aria-hidden className="mt-1 text-brand-700">
              ✓
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <Link
        href={`/services/${service.slug}`}
        className="mt-6 inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-900"
      >
        Voir le détail →
      </Link>
    </article>
  );
}
