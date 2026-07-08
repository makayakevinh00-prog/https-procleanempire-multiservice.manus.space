"use client";

import { FormEvent, useMemo, useState } from "react";

type FormValues = {
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  localType: string;
  surface: string;
  frequency: string;
  startDate: string;
  comments: string;
  photosCount: number;
};

const initialValues: FormValues = {
  name: "",
  company: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  localType: "",
  surface: "",
  frequency: "",
  startDate: "",
  comments: "",
  photosCount: 0
};

type RequiredStringField =
  | "name"
  | "company"
  | "phone"
  | "email"
  | "city"
  | "localType"
  | "surface"
  | "frequency";

const requiredFields: RequiredStringField[] = [
  "name",
  "company",
  "phone",
  "email",
  "city",
  "localType",
  "surface",
  "frequency"
];

export function QuoteForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [step, setStep] = useState(1);

  const missingFields = useMemo(
    () => requiredFields.filter((key) => !values[key].trim()),
    [values]
  );

  const progression = useMemo(() => Math.round((step / 4) * 100), [step]);
  const indicativeEstimate = useMemo(() => {
    const surface = Number(values.surface) || 0;
    const base = surface * 1.8;
    const frequencyFactor =
      values.frequency.toLowerCase().includes("quotid") || values.frequency.includes("5")
        ? 4
        : values.frequency.toLowerCase().includes("hebdo") || values.frequency.includes("1")
          ? 1
          : 2;
    const localTypeBonus =
      values.localType.toLowerCase().includes("restaurant") ||
      values.localType.toLowerCase().includes("hotel")
        ? 1.25
        : 1;
    const estimate = Math.round(base * frequencyFactor * localTypeBonus);
    return estimate > 0 ? estimate : null;
  }, [values.surface, values.frequency, values.localType]);

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSubmitError(null);

    if (missingFields.length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Échec de l'envoi.");
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Échec de l'envoi. Merci de réessayer ou de nous appeler directement."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    setAttempted(true);
    if (step === 1) {
      const step1Fields: RequiredStringField[] = ["localType", "surface", "frequency", "city"];
      const invalid = step1Fields.some((field) => !values[field].trim());
      if (invalid) {
        return;
      }
    }
    if (step === 2) {
      const step2Fields: RequiredStringField[] = ["name", "company", "phone", "email"];
      const invalid = step2Fields.some((field) => !values[field].trim());
      if (invalid) {
        return;
      }
    }
    setAttempted(false);
    setStep((current) => Math.min(current + 1, 4));
  }

  function previousStep() {
    setAttempted(false);
    setStep((current) => Math.max(current - 1, 1));
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8" noValidate>
      <div>
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Progression</span>
          <span>{progression}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#14213d] transition-all duration-300"
            style={{ width: `${progression}%` }}
          />
        </div>
      </div>

      {step === 1 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <InputField
            label="Type de prestation / locaux"
            value={values.localType}
            onChange={(value) => updateField("localType", value)}
            required
          />
          <InputField
            label="Surface (m²)"
            value={values.surface}
            onChange={(value) => updateField("surface", value)}
            required
          />
          <InputField
            label="Fréquence souhaitée"
            value={values.frequency}
            onChange={(value) => updateField("frequency", value)}
            required
          />
          <InputField
            label="Ville"
            value={values.city}
            onChange={(value) => updateField("city", value)}
            required
          />
          <InputField
            label="Adresse"
            value={values.address}
            onChange={(value) => updateField("address", value)}
          />
          <InputField
            label="Date souhaitée"
            type="date"
            value={values.startDate}
            onChange={(value) => updateField("startDate", value)}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <InputField
            label="Nom"
            value={values.name}
            onChange={(value) => updateField("name", value)}
            required
          />
          <InputField
            label="Entreprise"
            value={values.company}
            onChange={(value) => updateField("company", value)}
            required
          />
          <InputField
            label="Téléphone"
            value={values.phone}
            onChange={(value) => updateField("phone", value)}
            required
          />
          <InputField
            label="Email"
            type="email"
            value={values.email}
            onChange={(value) => updateField("email", value)}
            required
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Upload de photos (facultatif mais recommandé)
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => updateField("photosCount", event.target.files?.length ?? 0)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />
          </label>
          <p className="text-xs text-slate-500">
            Photos sélectionnées: {values.photosCount}
          </p>
          <label className="block text-sm font-medium text-slate-700">
            Commentaires complémentaires
            <textarea
              rows={4}
              value={values.comments}
              onChange={(event) => updateField("comments", event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-[#14213d] focus:outline-none focus:ring-1 focus:ring-[#14213d]"
            />
          </label>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-[#14213d]">Récapitulatif de votre demande</h3>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>Type de locaux: {values.localType || "-"}</li>
            <li>Surface: {values.surface || "-"} m²</li>
            <li>Fréquence: {values.frequency || "-"}</li>
            <li>Ville: {values.city || "-"}</li>
            <li>Entreprise: {values.company || "-"}</li>
            <li>Contact: {values.name || "-"} · {values.phone || "-"} · {values.email || "-"}</li>
          </ul>
          <p className="mt-4 rounded-xl border border-[#14213d]/20 bg-white p-3 text-sm text-slate-700">
            Estimation indicative mensuelle:{" "}
            <span className="font-semibold text-[#14213d]">
              {indicativeEstimate ? `~ ${indicativeEstimate} EUR` : "À définir après visite"}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Cette estimation est non contractuelle et sera affinée après visite du site.
          </p>
        </div>
      ) : null}

      {attempted && missingFields.length > 0 ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          Merci de compléter les champs obligatoires pour recevoir votre estimation.
        </p>
      ) : null}
      {submitError ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          {submitError}
        </p>
      ) : null}
      {submitted ? (
        <p className="mt-4 text-sm font-medium text-green-700">
          Demande envoyée. Un interlocuteur dédié revient vers vous pour la suite.
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {step > 1 && !submitted ? (
          <button type="button" onClick={previousStep} className="btn-secondary">
            Étape précédente
          </button>
        ) : null}
        {!submitted && (step < 4 ? (
          <button type="button" onClick={nextStep} className="btn-primary">
            Continuer
          </button>
        ) : (
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Envoi en cours..." : "Envoyer ma demande"}
          </button>
        ))}
      </div>
    </form>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label} {required ? <span aria-hidden="true">*</span> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-[#14213d] focus:outline-none focus:ring-1 focus:ring-[#14213d]"
      />
    </label>
  );
}
