import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkIcalUrl, parseIcal, type Platform } from "@/lib/concierge/ical";
import { PLANNED_STAGES, addDays, cleaningMessage, commissionOf, desiredCleanings, diffCleanings, monthLabel, recapMessage, type Listing, type Stay } from "@/lib/concierge/plan";

const num = (v: unknown) => (v == null ? 0 : Number(v));
const prevMonth = (today: string) => { const d = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
const asListing = (l: any): Listing => ({ ...l, cleaning_hours: l.cleaning_hours == null ? null : num(l.cleaning_hours), cleaning_price_ht: l.cleaning_price_ht == null ? null : num(l.cleaning_price_ht) });

/** Télécharge un calendrier iCal : https, hôtes reconnus, 3 redirections au plus (chacune revérifiée), 2 Mo au plus, 10 s. */
export async function fetchIcal(raw: string): Promise<string> {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    const c = checkIcalUrl(url);
    if (!c.ok) throw new Error(c.reason);
    const res = await fetch(c.url, { redirect: "manual", signal: AbortSignal.timeout(10_000), cache: "no-store", headers: { accept: "text/calendar, text/plain, */*" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { url = new URL(res.headers.get("location")!, c.url).toString(); continue; }
    if (!res.ok) throw new Error(`la plateforme répond ${res.status}`);
    if (num(res.headers.get("content-length")) > 2_000_000) throw new Error("calendrier trop volumineux");
    const text = await res.text();
    if (text.length > 2_000_000) throw new Error("calendrier trop volumineux");
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("ce lien n'est pas un calendrier iCal");
    return text;
  }
  throw new Error("trop de redirections");
}

/** Importe les réservations d'un logement : ajoute, met à jour, et marque annulées celles qui ont disparu de la plateforme. */
export async function syncListing(sb: SupabaseClient, listing: { id: string; ical_url: string | null; platform: Platform }, today: string) {
  if (!listing.ical_url) return { stays: 0 };
  try {
    const events = parseIcal(await fetchIcal(listing.ical_url), listing.platform).filter((e) => e.checkOut >= addDays(today, -60));
    const now = new Date().toISOString();
    if (events.length) {
      const { error } = await sb.from("concierge_stays").upsert(events.map((e) => ({ listing_id: listing.id, uid: e.uid, check_in: e.checkIn, check_out: e.checkOut, summary: e.summary || null, cancelled: false, updated_at: now })), { onConflict: "listing_id,uid" });
      if (error) throw new Error(error.message);
    }
    const seen = new Set(events.map((e) => e.uid));
    const { data: future } = await sb.from("concierge_stays").select("id, uid").eq("listing_id", listing.id).eq("cancelled", false).gte("check_out", today);
    const gone = (future ?? []).filter((s: any) => !seen.has(s.uid)).map((s: any) => s.id);
    if (gone.length) await sb.from("concierge_stays").update({ cancelled: true, updated_at: now }).in("id", gone);
    await sb.from("concierge_listings").update({ last_sync_at: now, last_sync_error: null }).eq("id", listing.id);
    return { stays: events.length };
  } catch (e) {
    await sb.from("concierge_listings").update({ last_sync_at: new Date().toISOString(), last_sync_error: (e as Error).message.slice(0, 160) }).eq("id", listing.id);
    return { stays: 0, error: (e as Error).message };
  }
}

export async function syncAll(sb: SupabaseClient, today: string) {
  const { data, error } = await sb.from("concierge_listings").select("id, ical_url, platform").not("ical_url", "is", null);
  if (error) throw new Error(error.message);
  let stays = 0, errors = 0;
  for (const l of (data ?? []) as any[]) { const r = await syncListing(sb, l, today); stays += r.stays; if (r.error) errors++; }
  return { listings: (data ?? []).length, stays, errors };
}

/** Un ménage à chaque départ : créé, déplacé tant qu'il n'est pas commencé, ou annulé si le séjour a disparu. */
export async function scheduleCleanings(sb: SupabaseClient, today: string) {
  const { data: ls, error } = await sb.from("concierge_listings").select("*").eq("auto_cleaning", true);
  if (error) throw new Error(error.message);
  const listings = (ls ?? []).map(asListing);
  if (!listings.length) return { created: 0, moved: 0, cancelled: 0 };
  const { data: st } = await sb.from("concierge_stays").select("id, listing_id, check_in, check_out, cancelled, intervention_id").in("listing_id", listings.map((l) => l.id)).gte("check_out", today);
  const stays = (st ?? []) as Stay[];
  const keys = stays.map((s) => `conc:${s.id}`);
  const { data: ex } = keys.length ? await sb.from("interventions").select("id, source_key, scheduled_date, start_time, stage, title").in("source_key", keys) : { data: [] };
  let created = 0, moved = 0, cancelled = 0;
  for (const l of listings) {
    const d = diffCleanings((ex ?? []) as any[], desiredCleanings(l, stays, today), stays.filter((s) => s.listing_id === l.id && s.cancelled).map((s) => `conc:${s.id}`));
    if (d.insert.length) {
      const price = l.cleaning_price_ht;
      const rows = d.insert.map((x) => ({
        client_id: l.client_id, contract_id: l.contract_id, site_id: l.site_id, title: x.title, scheduled_date: x.date, start_time: x.time, duration_hours: l.cleaning_hours,
        staff_id: l.staff_id, quantity: 1, unit_price_ht: price != null && price > 0 ? price : null, vat_rate: 20, billable: price != null && price > 0,
        source_key: x.sourceKey, stage: l.staff_id ? "affectee" : "planifiee", activity: "nettoyage_airbnb"
      }));
      const { data: made, error: e1 } = await sb.from("interventions").insert(rows).select("id, source_key");
      if (e1) throw new Error(e1.message);
      created += rows.length;
      for (const m of (made ?? []) as any[]) await sb.from("concierge_stays").update({ intervention_id: m.id }).eq("id", String(m.source_key).slice(5));
    }
    for (const u of d.update) { const { error: e2 } = await sb.from("interventions").update(u.patch).eq("id", u.id); if (!e2) moved++; }
    if (d.cancel.length) { const { error: e3 } = await sb.from("interventions").update({ stage: "annulee" }).in("id", d.cancel); if (!e3) cancelled += d.cancel.length; }
  }
  return { created, moved, cancelled };
}

async function emailable(sb: SupabaseClient, ids: string[]) {
  const { data } = await sb.from("clients").select("id, name, email, is_reserved, client_emails(email)").in("id", ids);
  return new Map(((data ?? []) as any[]).filter((c) => !c.is_reserved && (c.email || (c.client_emails ?? []).length)).map((c) => [c.id as string, c.name as string]));
}
const logementOf = (title: string) => title.replace(/^Ménage — /, "").replace(/ \(arrivée le même jour\)$/, "");

/** Messages au propriétaire PROPOSÉS (compte rendu après un ménage, récapitulatif en début de mois) : rien ne part sans validation. */
export async function prepareMessages(sb: SupabaseClient, today: string) {
  const proposals: { dedupe_key: string; title: string; summary: string; client_id: string; subject: string; body: string }[] = [];
  const { data: done } = await sb.from("interventions").select("id, client_id, title, scheduled_date").like("source_key", "conc:%").in("stage", ["terminee", "validee", "facturable", "facturee"]).gte("scheduled_date", addDays(today, -3)).lte("scheduled_date", today);
  for (const i of (done ?? []) as any[]) { const m = cleaningMessage(logementOf(i.title), i.scheduled_date); proposals.push({ dedupe_key: `menage:${i.id}`, title: `Compte rendu de ménage — ${logementOf(i.title)}`, summary: "Ménage terminé : confirmer au propriétaire.", client_id: i.client_id, ...m }); }
  if (Number(today.slice(8, 10)) <= 5) {
    const pm = prevMonth(today);
    const { data: month } = await sb.from("interventions").select("client_id, title").like("source_key", "conc:%").neq("stage", "annulee").gte("scheduled_date", `${pm}-01`).lt("scheduled_date", `${today.slice(0, 7)}-01`);
    const per = new Map<string, { n: number; names: Set<string> }>();
    for (const i of (month ?? []) as any[]) { const p = per.get(i.client_id) ?? { n: 0, names: new Set<string>() }; p.n++; p.names.add(logementOf(i.title)); per.set(i.client_id, p); }
    const { data: rev } = await sb.from("concierge_revenues").select("revenue_ht, contracts(client_id, commission_pct)").eq("month", pm);
    const commission = new Map<string, number>();
    for (const r of (rev ?? []) as any[]) if (r.contracts?.commission_pct) commission.set(r.contracts.client_id, (commission.get(r.contracts.client_id) ?? 0) + commissionOf(num(r.revenue_ht), num(r.contracts.commission_pct)));
    for (const [cid, p] of per) { const m = recapMessage(pm, p.n, [...p.names], commission.get(cid) ?? null); proposals.push({ dedupe_key: `recap:${cid}:${pm}`, title: `Récapitulatif de ${monthLabel(pm)}`, summary: `${p.n} ménage(s) le mois dernier.`, client_id: cid, ...m }); }
  }
  if (!proposals.length) return { proposed: 0 };
  const ok = await emailable(sb, [...new Set(proposals.map((p) => p.client_id))]);
  const wanted = proposals.filter((p) => ok.has(p.client_id));
  if (!wanted.length) return { proposed: 0 };
  const { data: known } = await sb.from("jarvis_actions").select("dedupe_key").eq("agent_key", "operations").in("dedupe_key", wanted.map((p) => p.dedupe_key));
  const seen = new Set((known ?? []).map((k: any) => k.dedupe_key));
  const rows = wanted.filter((p) => !seen.has(p.dedupe_key)).map((p) => ({
    agent_key: "operations", kind: "send_email", level: "L2", status: "proposed", dedupe_key: p.dedupe_key, title: p.title, summary: p.summary,
    payload: { client_id: p.client_id, subject: p.subject, body: p.body }, entity_type: "client", entity_id: p.client_id, href: `/clients/${p.client_id}`
  }));
  if (rows.length) { const { error } = await sb.from("jarvis_actions").insert(rows); if (error) throw new Error(error.message); }
  return { proposed: rows.length };
}

/** Brouillon de facture de commission : % du contrat × revenus locatifs saisis. Jamais envoyée : vous validez. */
export async function createCommissionDraft(sb: SupabaseClient, contractId: string, month: string): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string }> {
  const { data: r } = await sb.from("concierge_revenues").select("revenue_ht, invoice_id").eq("contract_id", contractId).eq("month", month).maybeSingle();
  if (!r) return { ok: false, error: "Saisissez d'abord les revenus locatifs du mois." };
  if (r.invoice_id) return { ok: false, error: "Un brouillon existe déjà pour ce mois." };
  const { data: c } = await sb.from("contracts").select("client_id, commission_pct, label, clients(name, is_reserved)").eq("id", contractId).maybeSingle();
  const cl = (c as any)?.clients;
  if (!c || !(num((c as any).commission_pct) > 0)) return { ok: false, error: "Ce contrat n'a pas de commission en %." };
  if (cl?.is_reserved) return { ok: false, error: `${cl.name} est un contact réservé : facturez-le vous-même.` };
  const amount = commissionOf(num(r.revenue_ht), num((c as any).commission_pct));
  if (!(amount > 0)) return { ok: false, error: "La commission calculée est nulle." };
  const { data: inv, error } = await sb.from("invoices").insert({ client_id: (c as any).client_id, subject: `Commission de gestion — ${monthLabel(month)}`, notes: `${num((c as any).commission_pct)} % de ${num(r.revenue_ht).toLocaleString("fr-FR")} € HT de revenus locatifs.` }).select("id").single();
  if (error || !inv) return { ok: false, error: error?.message ?? "Création impossible." };
  const { error: le } = await sb.from("invoice_lines").insert({ invoice_id: inv.id, position: 0, description: `Commission de gestion locative — ${monthLabel(month)} (${num((c as any).commission_pct)} % de ${num(r.revenue_ht).toLocaleString("fr-FR")} € HT)`, quantity: 1, unit_price_ht: amount, vat_rate: 20 });
  if (le) { await sb.from("invoices").delete().eq("id", inv.id); return { ok: false, error: le.message }; }
  await sb.from("concierge_revenues").update({ invoice_id: inv.id }).eq("contract_id", contractId).eq("month", month);
  return { ok: true, invoiceId: inv.id as string };
}

export async function prepareCommissions(sb: SupabaseClient, month: string) {
  const { data } = await sb.from("concierge_revenues").select("contract_id").eq("month", month).is("invoice_id", null);
  let drafts = 0;
  for (const r of (data ?? []) as any[]) { const x = await createCommissionDraft(sb, r.contract_id, month); if (x.ok) drafts++; }
  return { drafts };
}

/** Exécute les automatisations activées (tâche quotidienne ou bouton « Tout exécuter »). */
export async function runConcierge(sb: SupabaseClient, today: string) {
  const { data: au, error } = await sb.from("concierge_automations").select("key, enabled");
  if (error) return { skipped: "conciergerie non installée" };
  const on = new Map(((au ?? []) as any[]).map((a) => [a.key as string, a.enabled as boolean]));
  const out: Record<string, unknown> = { sync: await syncAll(sb, today) };
  if (on.get("menages")) out.menages = await scheduleCleanings(sb, today);
  if (on.get("messages")) out.messages = await prepareMessages(sb, today);
  if (on.get("facturation") && Number(today.slice(8, 10)) <= 10) out.facturation = await prepareCommissions(sb, prevMonth(today));
  return out;
}
export { PLANNED_STAGES };
