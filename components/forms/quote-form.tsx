"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { siteConfig } from "@/lib/site";

/* ---------- Questions adaptées à chaque prestation ---------- */
type Field = {
  key: string;
  label: string;
  type: "select" | "number" | "text" | "multi";
  options?: string[];
  required?: boolean;
};

type ServiceDef = { id: string; label: string; hint: string; fields: Field[] };

const frequencyPro = ["Quotidien", "2 à 3 fois par semaine", "1 fois par semaine", "Ponctuel"];

export const quoteServices: ServiceDef[] = [
  {
    id: "airbnb",
    label: "Ménage Airbnb",
    hint: "Location courte durée, conciergerie",
    fields: [
      { key: "logement", label: "Type de logement", type: "select", options: ["Studio", "T1", "T2", "T3", "T4 et plus", "Maison"], required: true },
      { key: "surface", label: "Surface (m²)", type: "number" },
      { key: "couchages", label: "Nombre de couchages", type: "number" },
      { key: "linge", label: "Linge de lit et serviettes", type: "select", options: ["Je fournis le linge", "À gérer par ProClean Empire", "À discuter"] },
      { key: "frequence", label: "Fréquence", type: "select", options: ["À chaque départ de voyageur", "Plusieurs fois par semaine", "Ponctuel"], required: true }
    ]
  },
  {
    id: "bureaux",
    label: "Bureaux",
    hint: "Entretien régulier de vos locaux",
    fields: [
      { key: "surface", label: "Surface (m²)", type: "number", required: true },
      { key: "frequence", label: "Fréquence", type: "select", options: frequencyPro, required: true },
      { key: "sanitaires", label: "Nombre de sanitaires", type: "number" },
      { key: "vitrerie", label: "Vitrerie à inclure", type: "select", options: ["Oui", "Non", "À discuter"] },
      { key: "horaires", label: "Horaires d'intervention", type: "select", options: ["Tôt le matin", "En journée", "En soirée", "Le week-end"] }
    ]
  },
  {
    id: "commerce",
    label: "Commerce",
    hint: "Boutique, agence, showroom",
    fields: [
      { key: "surface", label: "Surface (m²)", type: "number", required: true },
      { key: "frequence", label: "Fréquence", type: "select", options: frequencyPro, required: true },
      { key: "vitrine", label: "Vitrine à nettoyer", type: "select", options: ["Oui", "Non"] },
      { key: "horaires", label: "Horaires d'intervention", type: "select", options: ["Avant l'ouverture", "Après la fermeture", "Le week-end"] }
    ]
  },
  {
    id: "conciergerie",
    label: "Conciergerie d'entreprise",
    hint: "Gestion complète de vos espaces",
    fields: [
      {
        key: "besoins",
        label: "Ce dont vous avez besoin",
        type: "multi",
        options: [
          "Nettoyage quotidien",
          "Entretien des équipements",
          "Véhicules de société",
          "Décoration des fêtes",
          "Consommables & réassort",
          "Plantes",
          "Accueil & petits services"
        ],
        required: true
      },
      { key: "surface", label: "Surface des locaux (m²)", type: "number" },
      { key: "effectif", label: "Nombre de personnes sur place", type: "number" }
    ]
  },
  {
    id: "remise",
    label: "Remise en état",
    hint: "Fin de chantier, départ de locataire",
    fields: [
      { key: "type", label: "Situation", type: "select", options: ["Fin de chantier", "Départ de locataire", "Grand nettoyage", "Autre"], required: true },
      { key: "surface", label: "Surface (m²)", type: "number", required: true }
    ]
  },
  {
    id: "copropriete",
    label: "Copropriété",
    hint: "Halls et parties communes",
    fields: [
      { key: "batiments", label: "Nombre de bâtiments", type: "number", required: true },
      { key: "parties", label: "Parties communes", type: "text" },
      { key: "passages", label: "Passages par semaine", type: "select", options: ["1", "2", "3", "5 et plus"], required: true }
    ]
  },
  {
    id: "vehicules",
    label: "Véhicules de société",
    hint: "Voitures, utilitaires, avions",
    fields: [
      { key: "vehicule", label: "Type de véhicule", type: "select", options: ["Voiture", "Utilitaire", "Flotte (plusieurs véhicules)", "Avion"], required: true },
      { key: "nombre", label: "Nombre de véhicules", type: "number" },
      { key: "prestation", label: "Prestation", type: "select", options: ["Intérieur", "Extérieur", "Intérieur + extérieur"], required: true }
    ]
  }
];

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-[#1d6fe0] focus:outline-none focus:ring-1 focus:ring-[#1d6fe0]";

type Contact = { name: string; company: string; phone: string; email: string; comments: string };

export function QuoteForm({ defaultService }: { defaultService?: string }) {
  const [step, setStep] = useState(defaultService ? 2 : 1);
  const [serviceId, setServiceId] = useState(defaultService ?? "");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [contact, setContact] = useState<Contact>({ name: "", company: "", phone: "", email: "", comments: "" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Pré-sélection depuis l'URL : /contact?service=airbnb#devis
  useEffect(() => {
    if (defaultService) return;
    const fromUrl = new URLSearchParams(window.location.search).get("service");
    if (fromUrl && quoteServices.some((service) => service.id === fromUrl)) {
      setServiceId(fromUrl);
      setStep(2);
    }
  }, [defaultService]);

  const service = quoteServices.find((item) => item.id === serviceId);

  function validateStep2() {
    if (!service) return "Choisissez une prestation.";
    for (const field of service.fields) {
      if (field.required && !details[field.key]?.trim()) return `Merci de renseigner : ${field.label}.`;
    }
    if (!city.trim()) return "Merci d'indiquer l'adresse ou la ville de l'intervention.";
    return null;
  }

  function validateStep3() {
    if (!contact.name.trim()) return "Merci d'indiquer votre nom.";
    if (!/^[\d\s+().-]{8,}$/.test(contact.phone.trim())) return "Merci d'indiquer un numéro de téléphone valide.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) return "Merci d'indiquer une adresse e-mail valide.";
    if (!consent) return "Merci d'accepter d'être recontacté pour recevoir votre devis.";
    return null;
  }

  function next() {
    const problem = validateStep2();
    setError(problem);
    if (!problem) setStep(3);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3) return next();
    const problem = validateStep3();
    setError(problem);
    if (problem || !service) return;

    setSubmitting(true);
    try {
      const readable: Record<string, string> = {};
      for (const field of service.fields) {
        if (details[field.key]) readable[field.label] = details[field.key];
      }
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: service.label,
          details: readable,
          address,
          postcode,
          city,
          startDate,
          ...contact,
          consent,
          sourceUrl: window.location.href
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Échec de l'envoi.");
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'envoi. Merci de réessayer ou de nous appeler."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[28px] bg-white p-8 text-center shadow-soft md:p-12" role="status">
        <p className="text-4xl" aria-hidden>
          ✓
        </p>
        <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
          Demande bien reçue.
        </h3>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          Un e-mail de confirmation vient de vous être envoyé. Nous revenons vers vous sous 24h
          avec votre devis.
        </p>
        <a href={siteConfig.phoneHref} className="btn-pill-ghost mt-8 text-ink">
          Une urgence ? {siteConfig.phone}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[28px] bg-white p-6 shadow-soft md:p-10">
      {/* Progression */}
      <ol className="mb-8 flex gap-2 text-xs font-semibold uppercase tracking-wide" aria-label="Étapes">
        {["Prestation", "Détails", "Vos coordonnées"].map((label, index) => (
          <li key={label} className="flex-1">
            <span
              className={`block h-1.5 rounded-full ${index + 1 <= step ? "bg-[#1d6fe0]" : "bg-slate-200"}`}
            />
            <span className={`mt-2 block ${index + 1 === step ? "text-[#1d6fe0]" : "text-slate-400"}`}>
              {index + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <fieldset>
          <legend className="font-display text-2xl font-semibold tracking-tight text-ink">
            Quelle prestation vous intéresse ?
          </legend>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {quoteServices.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setServiceId(item.id);
                  setDetails({});
                  setError(null);
                  setStep(2);
                }}
                className={`rounded-2xl border p-5 text-left transition hover:border-[#1d6fe0] hover:bg-[#f5f9ff] ${
                  item.id === serviceId ? "border-[#1d6fe0] bg-[#f5f9ff]" : "border-slate-200"
                }`}
              >
                <span className="block font-semibold text-ink">{item.label}</span>
                <span className="mt-1 block text-sm text-slate-500">{item.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 2 && service ? (
        <div>
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">{service.label}</h3>
            <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-[#1d6fe0]">
              Changer
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {service.fields.map((field) => (
              <DetailField
                key={field.key}
                field={field}
                value={details[field.key] ?? ""}
                onChange={(value) => setDetails((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
            <AddressAutocomplete
              value={address}
              onChange={(value) => {
                setAddress(value);
                setCity("");
                setPostcode("");
              }}
              onSelect={(selection) => {
                setCity(selection.city);
                setPostcode(selection.postcode);
              }}
              required
            />
            <label className="text-sm font-medium text-slate-700">
              Ville <span aria-hidden="true">*</span>
              <input
                type="text"
                value={postcode ? `${postcode} ${city}` : city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setPostcode("");
                }}
                autoComplete="address-level2"
                placeholder="Remplie automatiquement"
                className={inputClass}
              />
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700 md:w-1/2">
            Date souhaitée
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">Où vous envoyer le devis ?</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ContactField label="Nom et prénom" required autoComplete="name" value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} />
            <ContactField label="Entreprise / conciergerie" autoComplete="organization" value={contact.company} onChange={(v) => setContact({ ...contact, company: v })} />
            <ContactField label="Téléphone" required type="tel" autoComplete="tel" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} />
            <ContactField label="E-mail" required type="email" autoComplete="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} />
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Message (accès, contraintes, questions…)
            <textarea
              rows={3}
              value={contact.comments}
              onChange={(event) => setContact({ ...contact, comments: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="mt-5 flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#1d6fe0]"
            />
            <span>
              J&apos;accepte que ProClean Empire me recontacte pour établir ce devis. Mes données
              ne servent qu&apos;à cette demande (
              <Link href="/politique-confidentialite" className="font-semibold text-[#1d6fe0] underline">
                politique de confidentialité
              </Link>
              ).
            </span>
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {step > 1 ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => { setError(null); setStep(step - 1); }} className="text-sm font-semibold text-slate-500">
            ← Retour
          </button>
          {step === 2 ? (
            <button type="button" onClick={next} className="btn-pill">
              Continuer
            </button>
          ) : (
            <button type="submit" disabled={submitting} className="btn-pill disabled:opacity-60">
              {submitting ? "Envoi…" : "Recevoir mon devis sous 24h"}
            </button>
          )}
        </div>
      ) : null}
    </form>
  );
}

function DetailField({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) {
  const label = (
    <>
      {field.label} {field.required ? <span aria-hidden="true">*</span> : null}
    </>
  );
  if (field.type === "multi") {
    const selected = value ? value.split(", ") : [];
    return (
      <fieldset className="md:col-span-2">
        <legend className="text-sm font-medium text-slate-700">{label}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {field.options?.map((option) => {
            const on = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange((on ? selected.filter((item) => item !== option) : [...selected, option]).join(", "))
                }
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  on ? "border-[#1d6fe0] bg-[#1d6fe0] text-white" : "border-slate-300 text-slate-700 hover:border-[#1d6fe0]"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      {field.type === "select" ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          <option value="">Choisir…</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "numeric" : undefined}
          min={field.type === "number" ? 0 : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
}

function ContactField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label} {required ? <span aria-hidden="true">*</span> : null}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}
