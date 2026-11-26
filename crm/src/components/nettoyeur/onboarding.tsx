import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { agentClient, type CleanerOverview } from "@/lib/agent";
import type { TrainingState } from "@/lib/formation";
import type { CleanerIdentity } from "@/lib/identity";

/** « Mise en route » : un seul bloc compact (formation, identité, adresse, IBAN) qui remplace les bandeaux d'alerte, et disparaît une fois tout fait. */
export async function Onboarding({
  token,
  o,
}: {
  token: string;
  o: CleanerOverview;
}) {
  const db = agentClient();
  const [tr, id] = await Promise.all([
    db.rpc("cleaner_training", { p_token: token }),
    db.rpc("cleaner_identity", { p_token: token }),
  ]);
  const t = tr.error ? null : (tr.data as TrainingState | null);
  const idn = id.error ? null : (id.data as CleanerIdentity | null);
  const base = `/nettoyeur/${token}`;
  const modules = t
    ? Object.values(t.modules).filter((m) => m.passed).length
    : 0;
  const steps: {
    key: string;
    label: string;
    sub: string;
    href: string;
    done: boolean;
    required: boolean;
  }[] = [];
  if (t)
    steps.push({
      key: "formation",
      label: "Formation ProClean",
      sub: t.certified_at
        ? "Certificat obtenu"
        : `${modules}/3 modules réussis`,
      href: `${base}/formation`,
      done: !!t.certified_at,
      required: true,
    });
  if (idn && idn.status !== "non_requis")
    steps.push({
      key: "identite",
      label: "Vérifier mon identité",
      sub:
        idn.status === "verifie"
          ? "Identité vérifiée"
          : idn.status === "en_cours"
            ? "Vérification en cours"
            : idn.status === "echec"
              ? "À refaire"
              : "Pièce d'identité + selfie, 2 min",
      href: `${base}/identite`,
      done: idn.status === "verifie",
      required: true,
    });
  steps.push({
    key: "adresse",
    label: "Mon adresse et mon secteur",
    sub: "Pour recevoir les ménages près de chez vous",
    href: `${base}/profil`,
    done: o.has_location || !!o.address_line,
    required: false,
  });
  steps.push({
    key: "iban",
    label: "Mon IBAN",
    sub: "Pour recevoir vos virements",
    href: `${base}/profil`,
    done: o.has_iban,
    required: false,
  });
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section
      className="fx-in mt-4 rounded-3xl bg-[var(--a-card)] p-4"
      style={{ animationDelay: "60ms" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold">Mise en route</h2>
        <span className="num text-[13px] font-extrabold text-[var(--a-pri)]">
          {done}/{steps.length}
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--a-line)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(done / steps.length) * 100}%`,
            background: "linear-gradient(90deg,#1e3a6e,#1d6fe0)",
          }}
        />
      </div>
      <ul className="space-y-1">
        {steps
          .filter((s) => !s.done)
          .map((s) => (
            <li key={s.key}>
              <Link
                href={s.href}
                className="fx-press flex items-center gap-3 rounded-2xl px-1 py-2"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--a-line)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold">
                    {s.label}
                    {s.required && (
                      <span className="ml-2 rounded-full bg-[var(--a-warnbg)] px-2 py-0.5 align-middle text-[10px] font-extrabold uppercase text-[var(--a-warn)]">
                        Obligatoire
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[13px] text-[var(--a-mute)]">
                    {s.sub}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-[var(--a-mute)]" />
              </Link>
            </li>
          ))}
        {steps
          .filter((s) => s.done)
          .map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-3 px-1 py-1.5 opacity-70"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--a-ok)] text-white">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-[14px] font-bold text-[var(--a-mute)]">
                {s.label}
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
}
