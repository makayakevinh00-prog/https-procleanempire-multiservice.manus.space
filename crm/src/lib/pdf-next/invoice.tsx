/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { Bar, C, Footer, Letterhead, Meta, PageShell, Party, Totals, dateFr, money, s } from "./kit";
import { CLIENT, CO, SITE } from "./mock-data";

export interface InvLine { title: string; detail?: string; date?: string; qty: number; unit: string; pu: number; vat: number }
const cols = { desc: "38%", date: "13%", qty: "15%", pu: "12%", vat: "8%", tot: "14%" };

export function InvoiceDoc({ lines, paid = 0, discount = 0 }: { lines: InvLine[]; paid?: number; discount?: number }) {
  const ht = lines.reduce((a, l) => a + l.qty * l.pu, 0) - discount;
  const rates = [...new Set(lines.map((l) => l.vat))].sort();
  const byRate = rates.map((r) => { const base = lines.filter((l) => l.vat === r).reduce((a, l) => a + l.qty * l.pu, 0) * (ht / (ht + discount)); return { rate: r, base, vat: base * r / 100 }; });
  const ttc = ht + byRate.reduce((a, r) => a + r.vat, 0);
  const rest = ttc - paid;
  return (
    <PageShell co={CO} doc="Facture F-2026-0042" title="Facture F-2026-0042">
      <Page size="A4" style={s.page}>
        <Bar />
        <Letterhead co={CO} title="FACTURE" number="F-2026-0042" pill="À régler" pillTone="amber" />
        <Meta items={[["Date d'émission", dateFr("2026-11-05")], ["Échéance", dateFr("2026-12-05")], ["Période", "Octobre 2026"], ["Mode de règlement", "Virement bancaire"]]} />
        <View style={[s.row, { marginBottom: 12 }]}>
          <Party title="Émetteur" lines={[{ t: CO.name, b: true }, { t: `${CO.address}, ${CO.zip} ${CO.city}` }, { t: `SIRET ${CO.siret}` }, { t: `${CO.legal} · ${CO.rcs}` }, { t: "TVA : voir pied de page" }]} />
          <View style={{ width: 12 }} />
          <Party tint title="Facturé à" lines={[{ t: CLIENT.name, b: true }, { t: CLIENT.contact }, { t: CLIENT.address }, { t: `${CLIENT.zip} ${CLIENT.city}` }, { t: CLIENT.siret }]} />
        </View>
        <View style={{ marginBottom: 16, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 6, borderWidth: 0.8, borderColor: C.line, flexDirection: "row" }}>
          <Text style={[s.label, { marginBottom: 0, width: 110 }]}>Lieu de prestation</Text>
          <Text style={{ fontSize: 9 }}>{SITE.name} — {SITE.address}</Text>
        </View>

        {/* Tableau aéré : pas de cadre, un trait fin sous l'en-tête et entre les lignes */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: C.navy, paddingBottom: 7 }}>
          <Text style={[s.label, { width: cols.desc, marginBottom: 0 }]}>Désignation</Text>
          <Text style={[s.label, { width: cols.date, marginBottom: 0 }]}>Date</Text>
          <Text style={[s.label, { width: cols.qty, marginBottom: 0, textAlign: "right" }]}>Qté</Text>
          <Text style={[s.label, { width: cols.pu, marginBottom: 0, textAlign: "right" }]}>P.U. HT</Text>
          <Text style={[s.label, { width: cols.vat, marginBottom: 0, textAlign: "right" }]}>TVA</Text>
          <Text style={[s.label, { width: cols.tot, marginBottom: 0, textAlign: "right" }]}>Total HT</Text>
        </View>
        {lines.map((l, i) => (
          <View key={i} wrap={false} style={{ flexDirection: "row", paddingVertical: 9, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
            <View style={{ width: cols.desc, paddingRight: 10 }}>
              <Text style={{ fontWeight: 600, fontSize: 10, color: C.navy }}>{l.title}</Text>
              {l.detail ? <Text style={{ fontSize: 8.5, color: C.grey, marginTop: 2 }}>{l.detail}</Text> : null}
            </View>
            <Text style={{ width: cols.date, fontSize: 9, color: C.grey }}>{l.date ?? ""}</Text>
            <Text style={{ width: cols.qty, textAlign: "right" }}>{String(l.qty).replace(".", ",")} {l.unit}</Text>
            <Text style={{ width: cols.pu, textAlign: "right" }}>{money(l.pu)}</Text>
            <Text style={{ width: cols.vat, textAlign: "right", color: C.grey }}>{l.vat} %</Text>
            <Text style={{ width: cols.tot, textAlign: "right", fontWeight: 700 }}>{money(l.qty * l.pu)}</Text>
          </View>
        ))}

        {/* Totaux + règlement : jamais séparés */}
        <View wrap={false} style={{ marginTop: 14 }}>
          <View style={s.row}>
            <View style={{ flex: 1, paddingRight: 28 }}>
              <Text style={s.label}>Conditions de règlement</Text>
              <Text style={{ fontSize: 8.8, marginBottom: 3 }}>Paiement par virement à 30 jours, avant le <Text style={{ fontWeight: 700 }}>{dateFr("2026-12-05")}</Text>.</Text>
              <View style={{ backgroundColor: C.light, borderRadius: 6, padding: 10, marginVertical: 6 }}>
                <Text style={{ fontSize: 7.5, color: C.grey, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>COORDONNÉES BANCAIRES</Text>
                <Text style={{ fontSize: 9, fontWeight: 600 }}>IBAN  {CO.iban}</Text>
                <Text style={{ fontSize: 8.5, color: C.grey }}>Référence à rappeler : F-2026-0042</Text>
              </View>
              <Text style={{ fontSize: 7.8, color: C.grey, lineHeight: 1.5 }}>En cas de retard de paiement, une pénalité égale à trois fois le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement (art. L.441-10 du Code de commerce). Aucun escompte pour paiement anticipé.</Text>
            </View>
            <Totals ht={ht} byRate={byRate} ttc={ttc} discount={discount ? { label: "Remise commerciale", value: discount } : undefined}
              extra={paid ? [{ label: "Acompte déjà réglé", value: `- ${money(paid)}`, tone: "green" }, { label: "Reste à payer", value: money(rest) }] : undefined} />
          </View>
        </View>
        <Footer co={CO} doc="Facture F-2026-0042" />
      </Page>
    </PageShell>
  );
}
