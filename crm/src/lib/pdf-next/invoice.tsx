/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { Bar, Body, Multi, C, Company, Footer, Letterhead, Meta, PageShell, Party, Totals, money, s } from "./kit";
import { lineTotals } from "../domain/billing";
import type { PdfDoc } from "../pdf/document";

const cols = { desc: "44%", qty: "13%", pu: "15%", vat: "10%", tot: "18%" };
export const dateLong = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "");
const nb = (n: number) => String(n).replace(".", ",");

export function splitLine(description: string) {
  const [title, ...rest] = description.split("\n");
  return { title: title.trim(), detail: rest.join("\n").trim() };
}

export function vatBreakdown(lines: PdfDoc["lines"]) {
  const m = new Map<number, { base: number; vat: number }>();
  for (const l of lines) { const t = lineTotals(l); const r = m.get(l.vat_rate) ?? { base: 0, vat: 0 }; r.base += t.ht; r.vat += t.vat; m.set(l.vat_rate, r); }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, base: v.base, vat: v.vat }));
}

export const addressLines = (c: PdfDoc["client"]) => [[c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", "), c.siret ? `SIRET ${c.siret}` : "", c.email ?? ""].filter((x) => x && x.trim()) as string[];

const STATUS: Record<string, [string, "blue" | "green" | "amber"]> = { brouillon: ["À régler", "amber"], envoye: ["À régler", "amber"], paye: ["Acquittée", "green"], en_retard: ["En retard", "amber"], annule: ["Annulée", "amber"] };

export function InvoiceDoc({ doc, co, paymentDays }: { doc: PdfDoc; co: Company; paymentDays: number }) {
  const [pill, tone] = (doc.number ? STATUS[doc.status] ?? ["", "blue"] : ["Brouillon", "blue"]) as [string, "blue" | "green" | "amber"];
  const paid = doc.paidAmount ?? 0;
  const rest = Math.max(0, doc.totals.ttc - paid);
  const label = `Facture ${doc.number ?? "(brouillon)"}`;
  return (
    <PageShell co={co} title={label}>
      <Page size="A4" style={s.page}>
        <Bar />
        <Footer co={co} doc={label} />
        <Body>
        <Letterhead co={co} title="FACTURE" number={doc.number ?? "Brouillon"} pill={pill} pillTone={tone} />
        <Meta items={[["Date d'émission", dateLong(doc.issueDate)], ["Échéance", dateLong(doc.dueOrValidUntil) || "À réception"], ["Mode de règlement", "Virement bancaire"]]} />
        <View style={[s.row, { marginBottom: 10 }]}>
          <Party title="Émetteur" lines={[{ t: co.name, b: true }, ...[co.address, [co.siret ? `SIRET ${co.siret}` : "", co.legal, co.rcs].filter(Boolean).join(" · ")].filter(Boolean).map((t) => ({ t }))]} />
          <View style={{ width: 12 }} />
          <Party tint title="Facturé à" lines={[{ t: doc.client.name, b: true }, ...addressLines(doc.client).map((t) => ({ t }))]} />
        </View>
        {doc.subject ? (
          <View style={{ marginBottom: 16, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 6, borderWidth: 0.8, borderColor: C.line, flexDirection: "row" }}>
            <Text style={[s.label, { marginBottom: 0, width: 56 }]}>Objet</Text>
            <Text style={{ fontSize: 9.5, fontWeight: 600, flex: 1 }}>{doc.subject}</Text>
          </View>
        ) : <View style={{ height: 6 }} />}

        <View style={{ flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: C.navy, paddingBottom: 7 }}>
          <Text style={[s.label, { width: cols.desc, marginBottom: 0 }]}>Désignation</Text>
          <Text style={[s.label, { width: cols.qty, marginBottom: 0, textAlign: "right" }]}>Qté</Text>
          <Text style={[s.label, { width: cols.pu, marginBottom: 0, textAlign: "right" }]}>P.U. HT</Text>
          <Text style={[s.label, { width: cols.vat, marginBottom: 0, textAlign: "right" }]}>TVA</Text>
          <Text style={[s.label, { width: cols.tot, marginBottom: 0, textAlign: "right" }]}>Total HT</Text>
        </View>
        {doc.lines.map((l, i) => {
          const { title, detail } = splitLine(l.description);
          return (
            <View key={i} wrap={false} style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
              <View style={{ width: cols.desc, paddingRight: 12 }}>
                <Text style={{ fontWeight: 600, fontSize: 10, color: C.navy }}>{title}</Text>
                {detail ? <Multi text={detail} style={{ fontSize: 8.6, color: C.grey, marginTop: 2 }} /> : null}
              </View>
              <Text style={{ width: cols.qty, textAlign: "right" }}>{nb(l.quantity)}</Text>
              <Text style={{ width: cols.pu, textAlign: "right" }}>{money(l.unit_price_ht)}</Text>
              <Text style={{ width: cols.vat, textAlign: "right", color: C.grey }}>{nb(l.vat_rate)} %</Text>
              <Text style={{ width: cols.tot, textAlign: "right", fontWeight: 700 }}>{money(lineTotals(l).ht)}</Text>
            </View>
          );
        })}

        <View wrap={false} style={{ marginTop: 12 }}>
          <View style={s.row}>
            <View style={{ flex: 1, paddingRight: 28 }}>
              <Text style={s.label}>Conditions de règlement</Text>
              <Text style={{ fontSize: 8.8, marginBottom: 3 }}>Paiement par virement sous {paymentDays} jours{doc.dueOrValidUntil ? <>, avant le <Text style={{ fontWeight: 700 }}>{dateLong(doc.dueOrValidUntil)}</Text></> : ""}.</Text>
              {co.iban ? (
                <View style={{ backgroundColor: C.light, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, marginVertical: 5 }}>
                  <Text style={{ fontSize: 8.8, fontWeight: 600 }}>IBAN  {co.iban}{co.bic ? `   ·   BIC ${co.bic}` : ""}{doc.number ? `   ·   Réf. ${doc.number}` : ""}</Text>
                </View>
              ) : null}
              <Text style={{ fontSize: 7.8, color: C.grey, lineHeight: 1.5 }}>Retard : pénalité de 3 fois le taux d'intérêt légal ; relance dès le lendemain de l'échéance, puis indemnité forfaitaire de 40 € ajoutée à la 3e relance (art. L.441-10 C. com.). Aucun escompte.</Text>
              {doc.notes ? <Multi text={doc.notes} style={{ fontSize: 8.5, marginTop: 6 }} /> : null}
            </View>
            <Totals ht={doc.totals.ht} byRate={vatBreakdown(doc.lines)} ttc={doc.totals.ttc}
              extra={paid > 0 ? [{ label: "Déjà réglé", value: `- ${money(paid)}`, tone: "green" }, { label: "Reste à payer", value: money(rest) }] : undefined} />
          </View>
        </View>
        </Body>
      </Page>
    </PageShell>
  );
}
