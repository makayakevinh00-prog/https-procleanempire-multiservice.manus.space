/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { Bar, C, Footer, Letterhead, Meta, PageShell, Party, Totals, dateFr, money, s } from "./kit";
import { CLIENT, CO, SITE } from "./mock-data";

type QLine = { title: string; desc: string; freq: string; qty: number; unit: string; pu: number; vat: number; option?: boolean };
const SECTIONS: { title: string; lines: QLine[] }[] = [
  { title: "A · Entretien régulier", lines: [
    { title: "Entretien des parties communes", desc: "Nettoyage des halls, paliers et escaliers des bâtiments A et B : sols aspirés et lavés, mains courantes, boîtes aux lettres, poussières.", freq: "2 passages par semaine", qty: 8, unit: "passages", pu: 95, vat: 20 },
    { title: "Sortie et entretien des conteneurs", desc: "Sortie et rentrée des bacs, nettoyage du local poubelles.", freq: "2 fois par semaine", qty: 8, unit: "passages", pu: 18, vat: 20 }
  ] },
  { title: "B · Prestations complémentaires", lines: [
    { title: "Nettoyage de la vitrerie des parties communes", desc: "Vitres intérieures et extérieures accessibles, cadres et rebords. Passage trimestriel, lissé sur 12 mois.", freq: "Trimestriel", qty: 1, unit: "mensualité", pu: 75, vat: 20 }
  ] },
  { title: "C · Options (non incluses dans le total)", lines: [
    { title: "Remise en état annuelle des sols", desc: "Décapage et protection des sols des halls d'entrée.", freq: "1 fois par an", qty: 1, unit: "forfait unique", pu: 480, vat: 20, option: true }
  ] }
];
const cols = { d: "48%", q: "17%", p: "12%", v: "8%", t: "15%" };

function Sec({ title }: { title: string }) {
  return <View wrap={false} style={{ marginTop: 18, marginBottom: 4, flexDirection: "row", alignItems: "center" }}>
    <View style={{ width: 3, height: 13, backgroundColor: C.blue, marginRight: 8, borderRadius: 2 }} />
    <Text style={s.h2}>{title}</Text>
  </View>;
}

function Row({ l }: { l: QLine }) {
  return (
    <View wrap={false} style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: 0.6, borderBottomColor: C.line, opacity: l.option ? 0.85 : 1 }}>
      <View style={{ width: cols.d, paddingRight: 12 }}>
        <Text style={{ fontWeight: 600, fontSize: 10, color: C.navy }}>{l.title}{l.option ? "  (option)" : ""}</Text>
        <Text style={{ fontSize: 8.6, color: C.grey, marginTop: 2 }}>{l.desc}</Text>
        <View style={{ alignSelf: "flex-start", marginTop: 5, backgroundColor: C.blueSoft, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 }}><Text style={{ fontSize: 7.8, color: C.blue, fontWeight: 600 }}>{l.freq}</Text></View>
      </View>
      <Text style={{ width: cols.q, textAlign: "right", fontSize: 9 }}>{l.qty} {l.unit}</Text>
      <Text style={{ width: cols.p, textAlign: "right" }}>{money(l.pu)}</Text>
      <Text style={{ width: cols.v, textAlign: "right", color: C.grey }}>{l.vat} %</Text>
      <Text style={{ width: cols.t, textAlign: "right", fontWeight: 700 }}>{money(l.qty * l.pu)}</Text>
    </View>
  );
}

export function QuoteDoc() {
  const counted = SECTIONS.flatMap((x) => x.lines).filter((l) => !l.option);
  const ht = counted.reduce((a, l) => a + l.qty * l.pu, 0);
  const vat = ht * 0.2;
  return (
    <PageShell co={CO} doc="Devis D-2026-0017" title="Devis D-2026-0017">
      <Page size="A4" style={s.page}>
        <Bar />
        <Letterhead co={CO} title="DEVIS" number="D-2026-0017" pill="En attente de signature" pillTone="blue" />
        <Meta items={[["Date de création", dateFr("2026-11-05")], ["Valable jusqu'au", dateFr("2026-12-05")], ["Début souhaité", "Janvier 2027"], ["Interlocuteur", "Kevin — ProClean"]]} />
        <View style={[s.row, { marginBottom: 12 }]}>
          <Party title="Destinataire" tint lines={[{ t: CLIENT.name, b: true }, { t: CLIENT.contact }, { t: CLIENT.address }, { t: `${CLIENT.zip} ${CLIENT.city}` }, { t: CLIENT.email }]} />
          <View style={{ width: 12 }} />
          <Party title="Lieu de prestation" lines={[{ t: SITE.name, b: true }, { t: SITE.address }, { t: "Accès : badge fourni par le syndic" }]} />
        </View>

        <View style={{ marginTop: 6, marginBottom: 2 }}>
          <Text style={[s.h2, { fontSize: 15, marginBottom: 6 }]}>Notre proposition pour votre résidence</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6, color: C.ink }}>Madame Martin,</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6, color: C.ink, marginTop: 6 }}>Nous vous remercions pour l'intérêt porté à ProClean Empire. Nous avons le plaisir de vous présenter notre proposition commerciale pour l'entretien de votre résidence : une équipe dédiée, des produits professionnels et un contrôle qualité à chaque passage.</Text>
        </View>

        <View style={{ flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: C.navy, paddingBottom: 7, marginTop: 6 }}>
          <Text style={[s.label, { width: cols.d, marginBottom: 0 }]}>Prestation</Text>
          <Text style={[s.label, { width: cols.q, marginBottom: 0, textAlign: "right" }]}>Quantité</Text>
          <Text style={[s.label, { width: cols.p, marginBottom: 0, textAlign: "right" }]}>P.U. HT</Text>
          <Text style={[s.label, { width: cols.v, marginBottom: 0, textAlign: "right" }]}>TVA</Text>
          <Text style={[s.label, { width: cols.t, marginBottom: 0, textAlign: "right" }]}>Total HT</Text>
        </View>
        {SECTIONS.map((sec) => (<View key={sec.title}><View wrap={false}><Sec title={sec.title} /><Row l={sec.lines[0]} /></View>{sec.lines.slice(1).map((l, i) => <Row key={i} l={l} />)}</View>))}

        <View wrap={false} style={{ marginTop: 14 }}>
          <View style={s.row}>
            <View style={{ flex: 1, paddingRight: 28 }}>
              <Text style={s.label}>Modalités de paiement</Text>
              <Text style={{ fontSize: 9, marginBottom: 3 }}>Montants exprimés par mois. Facturation mensuelle, règlement par virement à 30 jours.</Text>
              <Text style={{ fontSize: 9, color: C.grey }}>Aucuns frais supplémentaires : produits, matériel et déplacements sont inclus. Option C facturée uniquement sur votre accord.</Text>
            </View>
            <Totals ht={ht} byRate={[{ rate: 20, base: ht, vat }]} ttc={ht + vat} />
          </View>
        </View>

        {/* Conditions commerciales */}
        <View style={{ marginTop: 20 }}>
          <Text style={[s.h2, { fontSize: 15, marginBottom: 8 }]}>Conditions commerciales</Text>
          <View style={[s.row, { marginBottom: 8 }]}>
            <View style={{ flex: 1, backgroundColor: C.light, borderRadius: 6, padding: 11, marginRight: 8 }}>
              <Text style={s.label}>Prestations incluses</Text>
              {["Main-d'œuvre et encadrement", "Produits et matériel professionnels", "Contrôle qualité à chaque passage", "Remplacement en cas d'absence d'un agent"].map((t) => <Text key={t} style={{ fontSize: 9, marginBottom: 3 }}>+  {t}</Text>)}
            </View>
            <View style={{ flex: 1, backgroundColor: C.light, borderRadius: 6, padding: 11, marginLeft: 8 }}>
              <Text style={s.label}>Prestations exclues</Text>
              {["Remise en état après sinistre ou travaux", "Nettoyage des façades et toitures", "Consommables sanitaires (sauf accord)", "Toute prestation non décrite au devis"].map((t) => <Text key={t} style={{ fontSize: 9, marginBottom: 3, color: C.grey }}>—  {t}</Text>)}
            </View>
          </View>
          {[
            ["Validité", "Ce devis est valable 30 jours à compter de sa date de création."],
            ["Conditions d'intervention", "Les interventions ont lieu aux jours et horaires convenus. Un accès aux locaux et à l'eau et à l'électricité est nécessaire."],
            ["Annulation", "Toute intervention annulée moins de 48 h à l'avance peut être facturée. Résiliation du contrat : voir conditions du contrat."],
            ["Conditions particulières", "Aucune."]
          ].map(([k, v]) => (
            <View key={k} wrap={false} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
              <Text style={{ width: 130, fontWeight: 700, color: C.navy, fontSize: 9 }}>{k}</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{v}</Text>
            </View>
          ))}

          {/* Acceptation — conçu pour la signature électronique */}
          <View break wrap={false}>
            <Text style={[s.h2, { fontSize: 18, marginBottom: 6 }]}>Acceptation du devis</Text>
            <View style={{ flexDirection: "row", backgroundColor: C.light, borderRadius: 6, padding: 14, marginBottom: 14 }}>
              {[["Devis", "D-2026-0017"], ["Client", CLIENT.name], ["Total TTC", money(ht + vat) + " / mois"], ["Début", "Janvier 2027"]].map(([k, v], i) => (<View key={k} style={{ flex: i === 1 ? 2 : 1, paddingLeft: i ? 10 : 0 }}><Text style={s.label}>{k}</Text><Text style={{ fontWeight: 600, fontSize: 9.5 }}>{v}</Text></View>))}
            </View>
            <Text style={{ fontSize: 9, color: C.grey, marginBottom: 10 }}>« Bon pour accord » : en signant, le client accepte le présent devis et ses conditions. Signature électronique sécurisée via notre prestataire agréé.</Text>
            <View style={s.row}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: C.blue, borderRadius: 8, padding: 14, marginRight: 8, minHeight: 118, backgroundColor: C.white }}>
                <Text style={[s.label, { color: C.blue }]}>Le client</Text>
                <Text style={{ fontSize: 9, marginTop: 2 }}>Nom du signataire : <Text style={{ fontWeight: 600 }}>________________________</Text></Text>
                <Text style={{ fontSize: 9, marginTop: 8 }}>Fait à : ______________  Le : ____ / ____ / ______</Text>
                <View style={{ marginTop: 10, height: 44, borderWidth: 0.8, borderStyle: "dashed", borderColor: "#9AA1B1", borderRadius: 4, justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: 8, color: "#9AA1B1" }}>Zone de signature électronique</Text></View>
              </View>
              <View style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 14, marginLeft: 8, minHeight: 118, backgroundColor: C.light }}>
                <Text style={s.label}>Pour ProClean Empire</Text>
                <Text style={{ fontSize: 9, marginTop: 2 }}>Kevin — Gérant</Text>
                <Text style={{ fontSize: 9, marginTop: 8 }}>Pontoise, le {dateFr("2026-11-05")}</Text>
                <View style={{ marginTop: 10, height: 44, borderWidth: 0.8, borderStyle: "dashed", borderColor: "#9AA1B1", borderRadius: 4, justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: 8, color: "#9AA1B1" }}>Signature électronique</Text></View>
              </View>
            </View>
          </View>
        </View>
        <Footer co={CO} doc="Devis D-2026-0017" />
      </Page>
    </PageShell>
  );
}
