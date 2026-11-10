"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, Loader2, Search } from "lucide-react";
import type { Client } from "@/lib/domain/types";
import type { Company } from "@/lib/entreprises";

type Hit = Company & { existing: { id: string; name: string } | null };
type Info = {
  siren: string;
  vat_number: string;
  naf_code: string;
  legal_form: string;
  creation_date: string;
  manager: string;
  registry_status: string;
  checked: string;
};

const ready = (t: string) =>
  /^[\d\s.]+$/.test(t)
    ? t.replace(/\D/g, "").length >= 9
    : t.trim().length >= 3;
const fmtDate = (d: string) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR") : "";

/** Recherche d'entreprise (nom commercial, SIREN, SIRET, n° de TVA) dans l'annuaire officiel ; un clic remplit la fiche. */
export function CompanyLookup({ client }: { client?: Partial<Client> }) {
  const root = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(true);
  const [info, setInfo] = useState<Info>({
    siren: client?.siren ?? "",
    vat_number: client?.vat_number ?? "",
    naf_code: client?.naf_code ?? "",
    legal_form: client?.legal_form ?? "",
    creation_date: client?.creation_date ?? "",
    manager: client?.manager ?? "",
    registry_status: client?.registry_status ?? "",
    checked: "",
  });

  useEffect(() => {
    const sel = root.current
      ?.closest("form")
      ?.elements.namedItem("kind") as HTMLSelectElement | null;
    if (!sel) return;
    const on = () => setVisible(sel.value === "entreprise");
    on();
    sel.addEventListener("change", on);
    return () => sel.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const t = q.trim();
    if (!ready(t)) {
      setHits([]);
      setState("idle");
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setState("loading");
      try {
        const r = await fetch(`/api/entreprises?q=${encodeURIComponent(t)}`, {
          signal: ctrl.signal,
        });
        const j = await r.json();
        if (!r.ok) {
          setError(j.error ?? "Recherche impossible.");
          setState("error");
          return;
        }
        setHits(j.results);
        setState(j.results.length ? "idle" : "empty");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Recherche impossible, réessayez.");
          setState("error");
        }
      }
    }, 350);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  function pick(h: Hit) {
    const form = root.current?.closest("form");
    const set = (name: string, v: string | null) => {
      const el = form?.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = v ?? "";
    };
    set("name", h.name);
    set("kind", "entreprise");
    set("address", h.address);
    set("postal_code", h.postal_code);
    set("city", h.city);
    set("siret", h.siret);
    setInfo({
      siren: h.siren,
      vat_number: h.vat_number,
      naf_code: h.naf_code ?? "",
      legal_form: h.legal_form ?? "",
      creation_date: h.creation_date ?? "",
      manager: h.manager ?? "",
      registry_status: h.active ? "actif" : "cesse",
      checked: "1",
    });
    setHits([]);
    setQ("");
    setState("idle");
  }

  const facts: [string, string][] = (
    [
      ["SIREN", info.siren],
      ["N° de TVA", info.vat_number],
      ["Code NAF", info.naf_code],
      ["Forme juridique", info.legal_form],
      ["Création", fmtDate(info.creation_date)],
      ["Dirigeant", info.manager],
    ] as [string, string][]
  ).filter(([, v]) => v);

  return (
    <div ref={root} className="sm:col-span-2">
      {(
        [
          "siren",
          "vat_number",
          "naf_code",
          "legal_form",
          "creation_date",
          "manager",
          "registry_status",
        ] as const
      ).map((k) => (
        <input key={k} type="hidden" name={k} value={info[k]} />
      ))}
      <input type="hidden" name="registry_checked" value={info.checked} />
      {visible && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <label
            htmlFor="company-q"
            className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-800"
          >
            <Building2 className="h-4 w-4 text-primary" /> Retrouver
            l&apos;entreprise
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-[18px] w-[18px] text-slate-400" />
            <input
              id="company-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              autoComplete="off"
              placeholder="Nom commercial, SIREN, SIRET ou n° de TVA"
              className="h-11 w-full rounded-lg border border-slate-300 bg-card pl-10 pr-10 text-[15px] placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            />
            {state === "loading" && (
              <Loader2 className="absolute right-3.5 top-3.5 h-[18px] w-[18px] animate-spin text-slate-400" />
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Annuaire officiel des entreprises : un clic remplit le nom,
            l&apos;adresse, le SIRET, la TVA et les informations légales.
          </p>
          {state === "error" && (
            <p className="mt-2 text-sm text-red-700">{error}</p>
          )}
          {state === "empty" && (
            <p className="mt-2 text-sm text-slate-500">
              Aucune entreprise trouvée. Vérifiez l&apos;orthographe ou essayez
              avec le SIREN.
            </p>
          )}
          {hits.length > 0 && (
            <ul className="mt-3 divide-y overflow-hidden rounded-lg border bg-card">
              {hits.map((h) => {
                const own = h.existing && h.existing.id === client?.id;
                return (
                  <li
                    key={h.siret || h.siren}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => pick(h)}
                      disabled={!!h.existing && !own}
                      className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-slate-900">
                        {h.name}
                        {!h.active && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Cessée
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        SIREN {h.siren}
                        {h.naf_code ? ` · NAF ${h.naf_code}` : ""}
                        {h.city ? ` · ${h.postal_code ?? ""} ${h.city}` : ""}
                      </span>
                    </button>
                    {h.existing && !own && (
                      <Link
                        href={`/clients/${h.existing.id}`}
                        className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Déjà client : ouvrir la fiche
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {facts.length > 0 && (
        <div className="mt-3 rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <BadgeCheck className="h-4 w-4 text-primary" /> Informations
            officielles
            {info.registry_status === "cesse" && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                Entreprise cessée
              </span>
            )}
            {info.registry_status === "actif" && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                En activité
              </span>
            )}
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {k}
                </dt>
                <dd className="text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
