/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { Bar, Body, Multi, C, Company, Footer, Letterhead, Meta, PageShell, Party, Totals, money, s } from "./kit";
import { addressLines, dateLong, splitLine, vatBreakdown } from "./invoice";
import { lineTotals } from "../domain/billing";
import type { PdfDoc } from "../pdf/document";
import { LEGAL_REP } from "../contracts/clauses";

const cols = { desc: "46%", qty: "12%", pu: "14%", vat: "10%", tot: "18%" };
const nb = (n: number) => String(n).replace(".", ",");

function SignBox({ title, name, tone, hint }: { title: string; name?: string; tone: "blue" | "grey"; hint: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: tone === "blue" ? C.blue : C.line, borderRadius: 8, padding: 14, minHeight: 124, backgroundColor: tone === "blue" ? C.white : C.light }}>
      <Text style={[s.label, tone === "blue" ? { color: C.blue } : {}]}>{title}</Text>
      <Text style={{ fontSize: 9, marginTop: 2 }}>{name ?? "Nom du signataire : ________________________"}</Text>
      <Text style={{ fontSize: 9, marginTop: 8 }}>Fait à : ______________   Le : ____ / ____ / ______</Text>
      <View style={{ marginTop: 10, height: 44, borderWidth: 0.8, borderStyle: "dashed", borderColor: "#9AA1B1", borderRadius: 4, justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: 8, color: "#9AA1B1" }}>{hint}</Text></View>
    </View>
  );
}

export function QuoteDoc({ doc, co, paymentDays }: { doc: PdfDoc; co: Company; paymentDays: number }) {
  const label = `Devis ${doc.number ?? "(brouillon)"}`;
  const first = doc.client.name.split(" ")[0];
  return (
    <PageShell co={co} title={label}>
      <Page size="A4" style={s.page}>
        <Bar />
        <Footer co={co} doc={label} />
        <Body>
        <Letterhead co={co} title="DEVIS" number={doc.number ?? "Brouillon"} pill={doc.number ? (doc.status === "accepte" ? "Accepté" : doc.status === "refuse" ? "Refusé" : doc.status === "envoye" ? "En attente de signature" : "Brouillon") : "Brouillon"} pillTone={doc.status === "accepte" ? "green" : "blue"} />
        <Meta items={[["Date de création", dateLong(doc.issueDate)], ["Valable jusqu'au", dateLong(doc.dueOrValidUntil) || "30 jours"], ["Mode de règlement", `Virement à ${paymentDays} jours`]]} />
        <View style={[s.row, { marginBottom: 12 }]}>
          <Party tint title="Destinataire" lines={[{ t: doc.client.name, b: true }, ...addressLines(doc.client).map((t) => ({ t }))]} />
          <View style={{ width: 12 }} />
          <Party title="Émetteur" lines={[{ t: co.name, b: true }, ...[co.address, co.siret ? `SIRET ${co.siret}` : "", [co.phone, co.email].filter(Boolean).join(" · ")].filter(Boolean).map((t) => ({ t }))]} />
        </View>

        <View style={{ marginTop: 6, marginBottom: 4 }}>
          <Text style={[s.h2, { fontSize: 15, marginBottom: 6 }]}>{doc.subject ?? "Notre proposition"}</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>Bonjour{first ? ` ${first}` : ""},</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6, marginTop: 5 }}>Nous vous remercions pour l'intérêt porté à ProClean Empire. Nous avons le plaisir de vous présenter notre proposition commerciale : une équipe dédiée, des produits professionnels et un suivi de la qualité à chaque intervention.</Text>
        </View>

        <View style={{ flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: C.navy, paddingBottom: 7, marginTop: 10 }}>
          <Text style={[s.label, { width: cols.desc, marginBottom: 0 }]}>Prestation</Text>
          <Text style={[s.label, { width: cols.qty, marginBottom: 0, textAlign: "right" }]}>Qté</Text>
          <Text style={[s.label, { width: cols.pu, marginBottom: 0, textAlign: "right" }]}>P.U. HT</Text>
          <Text style={[s.label, { width: cols.vat, marginBottom: 0, textAlign: "right" }]}>TVA</Text>
          <Text style={[s.label, { width: cols.tot, marginBottom: 0, textAlign: "right" }]}>Total HT</Text>
        </View>
        {doc.lines.map((l, i) => {
          const { title, detail } = splitLine(l.description);
          return (
            <View key={i} wrap={false} style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
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

        <View wrap={false} style={{ marginTop: 14 }}>
          <View style={s.row}>
            <View style={{ flex: 1, paddingRight: 28 }}>
              <Text style={s.label}>Modalités de paiement</Text>
              <Text style={{ fontSize: 9, marginBottom: 3 }}>Règlement par virement sous {paymentDays} jours après facturation.</Text>
              {doc.notes ? <Multi text={doc.notes} style={{ fontSize: 9, color: C.grey }} /> : null}
            </View>
            <Totals ht={doc.totals.ht} byRate={vatBreakdown(doc.lines)} ttc={doc.totals.ttc} />
          </View>
        </View>

        <View wrap={false} style={{ marginTop: 22 }}>
          <Text style={[s.h2, { fontSize: 15, marginBottom: 8 }]}>Conditions commerciales</Text>
          {[["Validité", doc.dueOrValidUntil ? `Ce devis est valable jusqu'au ${dateLong(doc.dueOrValidUntil)}.` : "Ce devis est valable 30 jours."], ["Conditions", "Aucun escompte pour paiement anticipé. Les interventions sont planifiées d'un commun accord après acceptation du devis."]].map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
              <Text style={{ width: 110, fontWeight: 700, color: C.navy, fontSize: 9 }}>{k}</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{v}</Text>
            </View>
          ))}
        </View>

        </Body>
        <View break wrap={false} style={{ lineHeight: 1.2 }}>
          <Text style={[s.h2, { fontSize: 18, marginBottom: 6 }]}>Acceptation du devis</Text>
          <View style={{ flexDirection: "row", backgroundColor: C.light, borderRadius: 6, padding: 14, marginBottom: 14 }}>
            {[["Devis", doc.number ?? "Brouillon"], ["Client", doc.client.name], ["Total TTC", money(doc.totals.ttc)]].map(([k, v], i) => (<View key={k} style={{ flex: i === 1 ? 2 : 1, paddingLeft: i ? 10 : 0 }}><Text style={s.label}>{k}</Text><Text style={{ fontWeight: 600, fontSize: 9.5 }}>{v}</Text></View>))}
          </View>
          <Text style={{ fontSize: 9, color: C.grey, marginBottom: 10 }}>« Bon pour accord » : en signant, le client accepte le présent devis et ses conditions.</Text>
          <View style={s.row}>
            <SignBox title="Le client" tone="blue" hint="Zone de signature électronique" />
            <View style={{ width: 16 }} />
            <SignBox title={`Pour ${co.name}`} tone="grey" name={`${LEGAL_REP.name}, ${LEGAL_REP.title}`} hint="Signature électronique" />
          </View>
        </View>
      </Page>
    </PageShell>
  );
}
