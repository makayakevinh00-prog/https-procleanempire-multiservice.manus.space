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
  comments: ""
};

const requiredFields: Array<keyof FormValues> = [
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
  const [attempted, setAttempted] = useState(false);

  const missingFields = useMemo(
    () => requiredFields.filter((key) => !values[key].trim()),
    [values]
  );

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);

    if (missingFields.length > 0) {
      return;
    }

    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
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
          label="Type de locaux"
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
          label="Fréquence"
          value={values.frequency}
          onChange={(value) => updateField("frequency", value)}
          required
        />
        <InputField
          label="Date souhaitée"
          type="date"
          value={values.startDate}
          onChange={(value) => updateField("startDate", value)}
        />
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Commentaires
        <textarea
          rows={4}
          value={values.comments}
          onChange={(event) => updateField("comments", event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>
      {attempted && missingFields.length > 0 ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          Merci de compléter les champs obligatoires pour recevoir votre estimation.
        </p>
      ) : null}
      {submitted ? (
        <p className="mt-4 text-sm font-medium text-green-700">
          Demande envoyée. Un responsable vous contacte rapidement.
        </p>
      ) : null}
      <button type="submit" className="btn-primary mt-6">
        Recevoir une estimation
      </button>
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
        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </label>
  );
}
