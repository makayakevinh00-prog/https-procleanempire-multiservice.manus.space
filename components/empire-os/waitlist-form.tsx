"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

const PROFILES = [
  "Entreprise de nettoyage",
  "Conciergerie",
  "Indépendant",
  "Autre",
] as const;

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; duplicate: boolean }
  | { kind: "handoff"; mailto: string }
  | { kind: "error"; message: string; field?: string };

/** Inscription à la liste d'attente Empire OS (e-mail obligatoire, le reste facultatif). */
export function WaitlistForm({ source }: { source: string }) {
  const id = useId();
  const mountedAt = useRef(0);
  const statusRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const profile = String(form.get("profile") ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({
        kind: "error",
        field: "email",
        message:
          "Indiquez une adresse e-mail valide, par exemple prenom@entreprise.fr.",
      });
      emailRef.current?.focus();
      return;
    }
    if (form.get("consent") !== "on") {
      setStatus({
        kind: "error",
        field: "consent",
        message: "Cochez la case pour que nous puissions vous recontacter.",
      });
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/empire-os/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company,
          profile,
          consent: true,
          website: String(form.get("website") ?? ""),
          elapsedMs: Date.now() - mountedAt.current,
          source,
          referrer: document.referrer,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        handoff?: boolean;
        duplicate?: boolean;
        error?: string;
        field?: string;
      };
      if (!response.ok || !json.ok) {
        setStatus({
          kind: "error",
          field: json.field,
          message:
            json.error ??
            "L'inscription n'a pas fonctionné. Réessayez dans un instant.",
        });
      } else if (json.handoff) {
        const mailBody = `Bonjour,\n\nJe souhaite rejoindre la liste d'attente Empire OS.\n\nE-mail : ${email}\nEntreprise : ${company || "-"}\nProfil : ${profile || "-"}\n`;
        setStatus({
          kind: "handoff",
          mailto: `mailto:${siteConfig.email}?subject=${encodeURIComponent("Liste d'attente Empire OS")}&body=${encodeURIComponent(mailBody)}`,
        });
      } else {
        setStatus({ kind: "done", duplicate: json.duplicate === true });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Connexion impossible. Vérifiez votre réseau puis réessayez.",
      });
    }
    statusRef.current?.focus();
  }

  if (status.kind === "done") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-5 text-left outline-none"
      >
        <p className="flex items-center gap-2 text-base font-semibold text-white">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-emerald-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {status.duplicate
            ? "Vous êtes déjà sur la liste."
            : "Vous êtes sur la liste."}
        </p>
        <p className="mt-1 text-sm text-slate-200">
          Nous vous écrirons à l&apos;ouverture des accès. Aucun autre message
          d&apos;ici là.
        </p>
      </div>
    );
  }

  if (status.kind === "handoff") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border border-white/20 bg-white/10 p-5 text-left outline-none"
      >
        <p className="text-base font-semibold text-white">
          Dernière étape : envoyez votre inscription.
        </p>
        <p className="mt-1 text-sm text-slate-200">
          L&apos;enregistrement automatique n&apos;est pas disponible pour le
          moment. Un clic suffit, l&apos;e-mail est déjà rédigé.
        </p>
        <a href={status.mailto} className="btn-pill mt-4 min-h-11">
          Envoyer mon inscription par e-mail
        </a>
      </div>
    );
  }

  const sending = status.kind === "sending";
  const error = status.kind === "error" ? status : null;
  const inputClass =
    "min-h-12 w-full rounded-xl border bg-white/10 px-4 text-base text-white placeholder:text-slate-400 transition-colors duration-200 focus:border-[#8db8ff] focus:outline-none focus:ring-2 focus:ring-[#8db8ff]/60";

  return (
    <form onSubmit={onSubmit} noValidate className="text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor={`${id}-email`}
            className="mb-1.5 block text-sm font-medium text-slate-200"
          >
            E-mail professionnel
          </label>
          <input
            ref={emailRef}
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="prenom@entreprise.fr"
            aria-invalid={error?.field === "email"}
            aria-describedby={
              error?.field === "email" ? `${id}-error` : undefined
            }
            className={`${inputClass} ${error?.field === "email" ? "border-rose-300" : "border-white/25"}`}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-company`}
            className="mb-1.5 block text-sm font-medium text-slate-200"
          >
            Entreprise{" "}
            <span className="font-normal text-slate-300">(facultatif)</span>
          </label>
          <input
            id={`${id}-company`}
            name="company"
            type="text"
            autoComplete="organization"
            className={`${inputClass} border-white/25`}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-profile`}
            className="mb-1.5 block text-sm font-medium text-slate-200"
          >
            Vous êtes{" "}
            <span className="font-normal text-slate-300">(facultatif)</span>
          </label>
          <select
            id={`${id}-profile`}
            name="profile"
            defaultValue=""
            className={`${inputClass} cursor-pointer border-white/25 [&>option]:text-ink`}
          >
            <option value="">Choisir</option>
            {PROFILES.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Champ piège anti-robots : invisible et hors tabulation. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Site web
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-200">
        <input
          name="consent"
          type="checkbox"
          aria-invalid={error?.field === "consent"}
          aria-describedby={
            error?.field === "consent" ? `${id}-error` : undefined
          }
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-white/40 accent-[#1d6fe0]"
        />
        <span>
          J&apos;accepte d&apos;être recontacté par ProClean Empire au sujet
          d&apos;Empire OS.{" "}
          <Link
            href="/politique-confidentialite"
            className="underline underline-offset-2 hover:text-white"
          >
            Politique de confidentialité
          </Link>
        </span>
      </label>

      <div
        id={`${id}-error`}
        ref={statusRef}
        tabIndex={-1}
        role="alert"
        className="outline-none"
      >
        {error ? (
          <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-100">
            {error.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={sending}
        className="btn-pill mt-4 min-h-12 w-full cursor-pointer disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {sending ? "Inscription en cours…" : "Rejoindre la liste d'attente"}
      </button>
      <p className="mt-3 text-sm text-slate-300">
        Un seul e-mail, à l&apos;ouverture. Tarifs communiqués à ce moment-là.
      </p>
    </form>
  );
}
