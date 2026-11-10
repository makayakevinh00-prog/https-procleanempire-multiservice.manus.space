import Link from "next/link";
import { Lightbulb, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  applySuggestedPriceAction,
  saveServiceAction,
  setDefaultMarginAction,
  toggleServiceAction,
} from "@/app/actions/services";
import {
  ACTIVITY,
  CATEGORY,
  CATEGORY_ORDER,
  MONTH_NAMES,
  clientsFor,
  costOf,
  evaluate,
  seasonOpen,
  type MarginStatus,
  type Prospect,
} from "@/lib/prix";
import { num } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
import { formatEUR } from "@/lib/utils";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { deleteServiceAction } from "@/app/actions/manage";

export const dynamic = "force-dynamic";
const TONE: Record<MarginStatus, "green" | "orange" | "red" | "gray"> = {
  ok: "green",
  sous_cible: "orange",
  perte: "red",
  inconnu: "gray",
};
const eur = (n: number) => formatEUR(n);

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: { edit?: string; h?: string; m?: string; t?: string };
}) {
  const sb = createClient();
  const today = parisToday();
  const month = Number(today.slice(5, 7));
  const [svc, st, ct, lines, late] = await Promise.all([
    sb.from("services").select("*").order("code"),
    sb
      .from("app_settings")
      .select("indep_hourly_cost, default_target_margin_pct")
      .maybeSingle(),
    sb
      .from("contracts")
      .select("client_id, activity, start_date, clients(id, name, is_reserved)")
      .eq("status", "actif"),
    sb
      .from("invoice_lines")
      .select("description, invoices!inner(client_id)")
      .limit(3000),
    sb.from("invoices").select("client_id").eq("status", "en_retard"),
  ]);
  if (svc.error) throw new Error(svc.error.message);
  const hourly = num(st.data?.indep_hourly_cost ?? 0),
    defaultTarget = num(st.data?.default_target_margin_pct ?? 40);
  const all = (svc.data ?? []) as any[];
  const edited = searchParams.edit
    ? all.find((s) => s.id === searchParams.edit)
    : null;

  const rows = all.map((s) => {
    const target =
      s.target_margin_pct != null ? num(s.target_margin_pct) : defaultTarget;
    const cost = costOf(
      s.duration_hours == null ? null : num(s.duration_hours),
      hourly,
      num(s.materials_cost_ht ?? 0),
    );
    return {
      s,
      target,
      cost,
      ev: evaluate(num(s.unit_price_ht), cost, target),
    };
  });
  const shown = rows.filter((r) => r.s.active && num(r.s.unit_price_ht) > 0);
  const hidden = rows.filter((r) => !shown.includes(r));
  const measured = shown.filter((r) => r.ev.pct != null);
  const avg = measured.length
    ? Math.round(
        (measured.reduce((a, r) => a + (r.ev.pct ?? 0), 0) / measured.length) *
          10,
      ) / 10
    : null;
  const count = (k: MarginStatus) =>
    shown.filter((r) => r.ev.status === k).length;

  // Clients à qui proposer un complément : activité des contrats, ancienneté, aucun impayé en retard, pas déjà acheté.
  const lateIds = new Set(((late.data ?? []) as any[]).map((i) => i.client_id));
  const bought = new Map<string, string>();
  for (const l of (lines.data ?? []) as any[]) {
    const id = l.invoices?.client_id;
    if (id)
      bought.set(
        id,
        `${bought.get(id) ?? ""} ${String(l.description ?? "").toLowerCase()}`,
      );
  }
  const byClient = new Map<string, Prospect>();
  for (const k of (ct.data ?? []) as any[]) {
    if (!k.clients || k.clients.is_reserved) continue;
    const since = k.start_date
      ? Math.max(
          Math.floor((Date.parse(today) - Date.parse(k.start_date)) / 864e5),
          0,
        )
      : 0;
    const p: Prospect = byClient.get(k.client_id) ?? {
      id: k.client_id,
      name: k.clients.name,
      activities: [],
      sinceDays: 0,
      late: lateIds.has(k.client_id),
      bought: bought.get(k.client_id) ?? "",
    };
    if (k.activity) p.activities.push(k.activity);
    p.sinceDays = Math.max(p.sinceDays, since);
    byClient.set(k.client_id, p);
  }
  const offers = shown
    .filter((r) => r.s.complements?.length && r.ev.status !== "perte")
    .map((r) => ({
      ...r,
      who: clientsFor(r.s, month, [...byClient.values()]),
      season: seasonOpen(r.s.season_months, month),
    }))
    .filter((o) => o.who.length > 0)
    .sort(
      (a, b) =>
        Number(b.season) - Number(a.season) ||
        (b.ev.margin ?? 0) * b.who.length - (a.ev.margin ?? 0) * a.who.length,
    )
    .slice(0, 4);

  // Calculateur : le prix minimum pour ne jamais accepter une demande à perte.
  const ch = Number((searchParams.h ?? "").replace(",", ".")),
    cm = Number((searchParams.m ?? "0").replace(",", ".")) || 0;
  const ct_ = searchParams.t
    ? Number(searchParams.t.replace(",", "."))
    : defaultTarget;
  const calc =
    searchParams.h && ch >= 0 && ct_ >= 0 && ct_ < 100
      ? (() => {
          const cost = costOf(ch, hourly, cm)!;
          return { cost, ...evaluate(0, cost, ct_) };
        })()
      : null;

  const form = (
    <form
      key={edited?.id ?? "new"}
      action={saveServiceAction.bind(null, edited?.id ?? null)}
      className="grid gap-4 sm:grid-cols-6"
    >
      <Field label="Code" className="sm:col-span-1">
        <Input
          name="code"
          defaultValue={edited?.code ?? ""}
          placeholder="AIR-STU"
        />
      </Field>
      <Field
        label="Nom (court, sans nom de client ni adresse) *"
        className="sm:col-span-3"
      >
        <Input name="name" required defaultValue={edited?.name ?? ""} />
      </Field>
      <Field label="Type" className="sm:col-span-2">
        <Select name="category" defaultValue={edited?.category ?? ""}>
          <option value="">— à classer —</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Unité" className="sm:col-span-1">
        <Input
          name="unit"
          defaultValue={edited?.unit ?? ""}
          placeholder="passage"
        />
      </Field>
      <Field label="Prix HT (€) *" className="sm:col-span-1">
        <Input
          name="unit_price_ht"
          inputMode="decimal"
          required
          defaultValue={edited?.unit_price_ht ?? ""}
        />
      </Field>
      <Field label="TVA %" className="sm:col-span-1">
        <Input
          name="vat_rate"
          inputMode="decimal"
          defaultValue={edited?.vat_rate ?? 20}
        />
      </Field>
      <Field label="Temps passé (h)" className="sm:col-span-1">
        <Input
          name="duration_hours"
          inputMode="decimal"
          defaultValue={edited?.duration_hours ?? ""}
        />
      </Field>
      <Field label="Produits / déplacement (€)" className="sm:col-span-1">
        <Input
          name="materials_cost_ht"
          inputMode="decimal"
          defaultValue={edited?.materials_cost_ht ?? 0}
        />
      </Field>
      <Field
        label={`Marge cible % (vide = ${defaultTarget} %)`}
        className="sm:col-span-1"
      >
        <Input
          name="target_margin_pct"
          inputMode="decimal"
          defaultValue={edited?.target_margin_pct ?? ""}
        />
      </Field>
      <Field
        label="Description (facultative, insérable dans un devis)"
        className="sm:col-span-6"
      >
        <Textarea
          name="description"
          defaultValue={edited?.description ?? ""}
          className="min-h-[60px]"
        />
      </Field>
      <Field label="Mois où la proposer (ex. 11,12)" className="sm:col-span-2">
        <Input
          name="season_months"
          defaultValue={(edited?.season_months ?? []).join(",")}
          placeholder="toute l'année"
        />
      </Field>
      <fieldset className="sm:col-span-4">
        <legend className="mb-1.5 text-sm font-semibold text-slate-700">
          À proposer aux clients dont l&apos;activité est
        </legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTIVITY).map(([v, l]) => (
            <label
              key={v}
              className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                name="complements"
                value={v}
                defaultChecked={edited?.complements?.includes(v)}
              />{" "}
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="duration_estimated"
            defaultChecked={edited?.duration_estimated}
          />{" "}
          Temps estimé (à corriger avec le réel)
        </label>
        {edited && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={edited.active}
            />{" "}
            Active (visible dans les devis)
          </label>
        )}
        <Button>{edited ? "Enregistrer" : "Ajouter"}</Button>
      </div>
    </form>
  );

  return (
    <>
      <PageHeader
        title="Catalogue de prestations"
        subtitle="Vos prix, ce qu'ils vous coûtent et ce que vous gagnez. Ces prestations alimentent les devis et les factures."
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card px-5 py-3 text-[13px]">
        <span>
          Coût horaire retenu :{" "}
          <b className="num font-medium text-foreground">{eur(hourly)}</b>{" "}
          <Link href="/recrutement" className="text-primary underline">
            réglage
          </Link>
        </span>
        <span>
          Marge moyenne :{" "}
          <b className="num font-medium text-foreground">
            {avg == null ? "—" : `${avg} %`}
          </b>
        </span>
        <span className="text-[#b3382c]">
          {count("perte") ? `${count("perte")} à perte` : ""}
        </span>
        <span className="text-[#8f5a12]">
          {count("sous_cible") ? `${count("sous_cible")} sous la cible` : ""}
        </span>
        <span className="text-muted-foreground">
          {count("inconnu") ? `${count("inconnu")} sans temps renseigné` : ""}
        </span>
        <form
          action={setDefaultMarginAction}
          className="ml-auto flex items-center gap-2"
        >
          <label htmlFor="dm" className="text-muted-foreground">
            Marge cible par défaut
          </label>
          <Input
            id="dm"
            name="default_target_margin_pct"
            inputMode="decimal"
            defaultValue={defaultTarget}
            className="h-9 w-20 py-1"
          />{" "}
          %
          <Button size="sm" variant="outline">
            OK
          </Button>
        </form>
      </div>
      {rows.some((r) => r.s.duration_estimated) && (
        <p className="mb-4 text-xs text-muted-foreground">
          Les temps « estimés » sont des valeurs de départ : corrigez-les avec
          vos temps réels (moyenne constatée sur vos passages : environ 2,3 h),
          les marges se recalculent.
        </p>
      )}

      {offers.length > 0 && (
        <Card className="mb-4 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> À proposer en ce
              moment
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              pour gagner plus par client
            </span>
          </CardHeader>
          <div className="divide-y">
            {offers.map((o) => (
              <div key={o.s.id} className="px-6 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <b className="font-medium text-foreground">{o.s.name}</b>
                  {o.season && (
                    <Badge tone="blue">
                      Saison :{" "}
                      {(o.s.season_months as number[])
                        .map((m) => MONTH_NAMES[m - 1])
                        .join(", ")}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {eur(num(o.s.unit_price_ht))} HT
                    {o.ev.margin != null
                      ? ` · +${eur(o.ev.margin)} de marge`
                      : ""}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  À proposer à :{" "}
                  {o.who.slice(0, 5).map((c, i) => (
                    <span key={c.id}>
                      {i ? ", " : ""}
                      <Link
                        href={`/clients/${c.id}`}
                        className="text-primary underline"
                      >
                        {c.name}
                      </Link>
                    </span>
                  ))}
                  {o.who.length > 5 ? ` et ${o.who.length - 5} autre(s)` : ""}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <details className="mb-4 rounded-xl border bg-card" open={!!calc}>
        <summary className="cursor-pointer list-none px-5 py-3.5 text-[14px] font-semibold text-primary">
          Calculer le prix d&apos;une demande (pour ne jamais accepter à perte)
        </summary>
        <form
          className="grid gap-3 border-t px-5 py-4 sm:grid-cols-4"
          action="/catalogue"
        >
          <Field label="Temps passé (h)">
            <Input
              name="h"
              inputMode="decimal"
              defaultValue={searchParams.h ?? ""}
              placeholder="ex. 0,5"
            />
          </Field>
          <Field label="Produits / déplacement (€)">
            <Input
              name="m"
              inputMode="decimal"
              defaultValue={searchParams.m ?? ""}
              placeholder="0"
            />
          </Field>
          <Field label="Marge cible (%)">
            <Input
              name="t"
              inputMode="decimal"
              defaultValue={searchParams.t ?? defaultTarget}
            />
          </Field>
          <div className="flex items-end">
            <Button>Calculer</Button>
          </div>
          {calc && (
            <p className="rounded-lg bg-secondary/60 px-4 py-3 text-sm text-secondary-foreground sm:col-span-4">
              Coût de revient :{" "}
              <b className="font-medium text-foreground">{eur(calc.cost)}</b> ·
              en dessous de{" "}
              <b className="font-medium text-foreground">
                {eur(calc.floor ?? 0)}
              </b>{" "}
              vous perdez de l&apos;argent · prix conseillé pour {ct_} % de
              marge :{" "}
              <b className="font-medium text-foreground">
                {eur(calc.suggested ?? 0)} HT
              </b>
              .
            </p>
          )}
        </form>
      </details>

      <details className="mb-6 rounded-xl border bg-card" open={!!edited}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-[14px] font-semibold text-primary">
          <Plus className="h-4 w-4" />{" "}
          {edited ? `Modifier « ${edited.name} »` : "Nouvelle prestation"}
          {edited && (
            <Link
              href="/catalogue"
              className="ml-auto text-xs font-normal hover:underline"
            >
              Annuler
            </Link>
          )}
        </summary>
        <CardContent className="border-t pt-4">{form}</CardContent>
      </details>

      {[...CATEGORY_ORDER, ""].map((cat) => {
        const list = shown.filter((r) => (r.s.category ?? "") === cat);
        if (!list.length && cat !== "commerces") return null;
        return (
          <Card key={cat || "autres"} className="mb-4">
            <CardHeader>
              <CardTitle>{cat ? CATEGORY[cat] : "À classer"}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {list.length} prestation{list.length > 1 ? "s" : ""}
              </span>
            </CardHeader>
            {!list.length ? (
              <Empty>
                Aucune prestation pour les commerces : ajoutez-en une, ou
                chiffrez une idée ci-dessous.
              </Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Prestation</Th>
                    <Th className="text-right">Prix HT</Th>
                    <Th className="text-right">Coût</Th>
                    <Th>Marge</Th>
                    <Th className="text-right">Conseillé</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ s, cost, ev, target }) => (
                    <Tr key={s.id}>
                      <Td className="font-medium">
                        {s.name}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {s.code}
                          {s.unit ? ` · par ${s.unit}` : ""}
                          {s.duration_hours != null
                            ? ` · ${num(s.duration_hours)} h${s.duration_estimated ? " (estimé)" : ""}`
                            : ""}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-right">
                        {eur(num(s.unit_price_ht))}
                      </Td>
                      <Td className="whitespace-nowrap text-right text-muted-foreground">
                        {cost == null ? "—" : eur(cost)}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {ev.status === "inconnu" ? (
                          <Badge tone="gray">Temps à renseigner</Badge>
                        ) : (
                          <Badge tone={TONE[ev.status]}>
                            {ev.status === "perte"
                              ? `À perte (${eur(ev.margin ?? 0)})`
                              : `${ev.pct} % · ${eur(ev.margin ?? 0)}`}
                          </Badge>
                        )}
                        {ev.status === "sous_cible" && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            cible {target} %
                          </span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-right">
                        {ev.suggested == null ? (
                          "—"
                        ) : (
                          <>
                            {eur(ev.suggested)}
                            {ev.suggested !== num(s.unit_price_ht) && (
                              <form
                                action={applySuggestedPriceAction.bind(
                                  null,
                                  s.id,
                                  ev.suggested,
                                )}
                                className="ml-2 inline"
                              >
                                <button className="text-xs text-primary hover:underline">
                                  Appliquer
                                </button>
                              </form>
                            )}
                          </>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-right">
                        <Link
                          href={`/catalogue?edit=${s.id}`}
                          className="mr-3 text-xs text-primary hover:underline"
                        >
                          Modifier
                        </Link>
                        <form
                          action={toggleServiceAction.bind(
                            null,
                            s.id,
                            !s.active,
                          )}
                          className="inline"
                        >
                          <button className="text-xs text-muted-foreground hover:underline">
                            Masquer
                          </button>
                        </form>
                        <ConfirmAction
                          action={deleteServiceAction.bind(null, s.id)}
                          label="Supprimer"
                          variant="ghost"
                          size="sm"
                          className="ml-2 text-red-700"
                          title={`Supprimer « ${s.name} » ?`}
                          description="La prestation est retirée du catalogue. Les devis et factures déjà faits ne changent pas."
                          confirmLabel="Oui, supprimer"
                        />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        );
      })}

      {hidden.length > 0 && (
        <details className="rounded-xl border bg-card">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-[14px] font-semibold text-foreground">
            Idées à chiffrer et prestations masquées ({hidden.length})
          </summary>
          <div className="divide-y border-t">
            {hidden.map(({ s }) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.code}
                    {s.category ? ` · ${CATEGORY[s.category]}` : ""}
                    {num(s.unit_price_ht) > 0
                      ? ` · ${eur(num(s.unit_price_ht))} HT`
                      : " · à chiffrer"}
                  </span>
                </div>
                <Link
                  href={`/catalogue?edit=${s.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {num(s.unit_price_ht) > 0 ? "Modifier" : "Chiffrer"}
                </Link>
                <form action={toggleServiceAction.bind(null, s.id, !s.active)}>
                  <button className="text-xs text-muted-foreground hover:underline">
                    {s.active ? "Masquer" : "Réactiver"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
