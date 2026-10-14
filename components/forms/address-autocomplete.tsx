"use client";

import { useEffect, useId, useRef, useState } from "react";

export type AddressSelection = {
  label: string;
  street: string;
  postcode: string;
  city: string;
};

type Feature = {
  properties: {
    label: string;
    name: string;
    postcode: string;
    city: string;
    context?: string;
  };
};

// Base Adresse Nationale (IGN / data.gouv.fr) : gratuite, sans clé, adresses françaises officielles.
const ENDPOINT = "https://data.geopf.fr/geocodage/search";

/**
 * Champ adresse avec suggestions pendant la frappe (comme sur iPhone).
 * Au choix d'une suggestion, renvoie rue, code postal et ville pour remplir le reste du formulaire.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  required = false,
  label = "Adresse de l'intervention"
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (selection: AddressSelection) => void;
  required?: boolean;
  label?: string;
}) {
  const [suggestions, setSuggestions] = useState<Feature[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNext = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 4) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: "5", autocomplete: "1" });
        const response = await fetch(`${ENDPOINT}?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { features?: Feature[] };
        setSuggestions(data.features ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        // Réseau indisponible : le champ reste un champ texte classique.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function choose(feature: Feature) {
    const { label: fullLabel, name, postcode, city } = feature.properties;
    skipNext.current = true;
    onChange(fullLabel);
    onSelect({ label: fullLabel, street: name, postcode, city });
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <label className="text-sm font-medium text-slate-700">
        {label} {required ? <span aria-hidden="true">*</span> : null}
        <input
          type="text"
          value={value}
          autoComplete="street-address"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Ex. 3 rue Stéphane Charbonnier, Pontoise"
          required={required}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (!open || suggestions.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, suggestions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && active >= 0) {
              event.preventDefault();
              choose(suggestions[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 focus:border-[#1d6fe0] focus:outline-none focus:ring-1 focus:ring-[#1d6fe0]"
        />
      </label>
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.map((feature, index) => (
            <li
              key={`${feature.properties.label}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(feature);
              }}
              className={`cursor-pointer px-4 py-3 text-sm ${
                index === active ? "bg-[#eef4ff] text-ink" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="font-medium text-ink">{feature.properties.name}</span>
              <span className="block text-xs text-slate-500">
                {feature.properties.postcode} {feature.properties.city}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
