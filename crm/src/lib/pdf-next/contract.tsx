import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { Bar, C, Footer, Letterhead, PageShell, Party, dateFr, money, s } from "./kit";
import { CLIENT, CO, SITE } from "./mock-data";

const ART: [string, string[]][] = [
  ["Objet du contrat", ["Le présent contrat a pour objet la réalisation, par ProClean Empire (le « Prestataire »), des prestations d'entretien et de nettoyage décrites à l'article 3 pour le compte du Client, sur le site désigné à l'article 1."]],
  ["Description des prestations", ["Entretien des parties communes : halls, paliers, escaliers et ascenseurs des bâtiments A et B (sols, mains courantes, boîtes aux lettres, poussières).", "Sortie et rentrée des conteneurs, nettoyage du local poubelles.", "Nettoyage trimestriel de la vitrerie des parties communes."]],
  ["Fréquence des interventions", ["Deux passages par semaine, les mardis et vendredis. Un calendrier prévisionnel est remis au Client ; toute modification est convenue d'un commun accord."]],
  ["Horaires et organisation", ["Les interventions ont lieu entre 7 h et 10 h. Le Prestataire désigne une équipe dédiée et un référent, joignable du lundi au samedi."]],
  ["Obligations de ProClean Empire", ["Exécuter les prestations avec soin, selon les règles de l'art, avec un personnel formé et des produits professionnels adaptés.", "Informer sans délai le Client de toute anomalie constatée et assurer le remplacement des intervenants absents."]],
  ["Obligations du client", ["Donner accès aux locaux, à l'eau et à l'électricité aux jours et horaires convenus.", "Signaler toute remarque dans un délai raisonnable afin de permettre une correction rapide."]],
  ["Tarification et paiement", [`Prix mensuel : ${money(979)} HT, soit ${money(1174.8)} TTC (TVA 20 %). Facturation mensuelle ; règlement par virement à 30 jours. Retard : pénalité de trois fois le taux d'intérêt légal et indemnité forfaitaire de 40 €.`]],
  ["Durée du contrat", ["Le contrat prend effet le 1er janvier 2027 pour une durée de douze mois."]],
  ["Reconduction", ["À son terme, le contrat est reconduit tacitement par périodes de douze mois, sauf dénonciation par lettre recommandée avec un préavis de deux mois."]],
  ["Résiliation", ["Chaque partie peut résilier le contrat en cas de manquement grave de l'autre partie, après mise en demeure restée sans effet pendant trente jours."]],
  ["Responsabilités", ["Le Prestataire est assuré en responsabilité civile professionnelle. Sa responsabilité est limitée aux dommages directs causés par ses intervenants dans l'exécution des prestations."]],
  ["Conditions particulières", ["Un badge d'accès sera remis au Prestataire par le syndic. Aucune autre condition particulière."]]
];

function Article({ n, t, p }: { n: number; t: string; p: string[] }) {
  return (
    <View wrap={false} style={{ marginBottom: 12, flexDirection: "row" }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: "center", justifyContent: "center", marginRight: 12 }}><Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 10, color: C.blue }}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.h2, { marginBottom: 3 }]}>{t}</Text>
        {p.map((x, i) => <Text key={i} style={{ fontSize: 9.5, lineHeight: 1.55, marginBottom: 3 }}>{x}</Text>)}
      </View>
    </View>
  );
}

export function ContractDoc() {
  return (
    <PageShell co={CO} doc="Contrat C-2026-0006" title="Contrat C-2026-0006">
      <Page size="A4" style={s.page}>
        <Bar />
        <Letterhead co={CO} title="CONTRAT" number="C-2026-0006" pill="Projet — à signer" pillTone="blue" />
        <View style={{ backgroundColor: C.navy, borderRadius: 8, padding: 18, marginBottom: 20 }}>
          <Text style={{ color: "#9CC0F5", fontSize: 8, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase" }}>Contrat récurrent</Text>
          <Text style={{ color: C.white, fontFamily: "Jakarta", fontWeight: 800, fontSize: 19, marginTop: 6, lineHeight: 1.2 }}>Contrat de nettoyage professionnel</Text>
          <Text style={{ color: "#BFD3F5", fontSize: 9.5, marginTop: 6 }}>Entretien des parties communes · à compter du 1er janvier 2027 · 12 mois reconductibles</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}><View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: "center", justifyContent: "center", marginRight: 12 }}><Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 10, color: C.blue }}>1</Text></View><Text style={s.h2}>Identification des parties</Text></View>
        <View style={[s.row, { marginBottom: 6 }]}>
          <Party title="Le Prestataire" lines={[{ t: CO.name, b: true }, { t: `${CO.legal} au capital de ${CO.capital}` }, { t: `${CO.address}, ${CO.zip} ${CO.city}` }, { t: `SIRET ${CO.siret} · ${CO.rcs}` }, { t: "Représentée par Kevin, gérant" }]} />
          <View style={{ width: 12 }} />
          <Party tint title="Le Client" lines={[{ t: CLIENT.name, b: true }, { t: CLIENT.contact.replace("À l'attention de", "Représenté par") }, { t: `${CLIENT.address}, ${CLIENT.zip} ${CLIENT.city}` }, { t: CLIENT.siret }]} />
        </View>
        <Text style={{ fontSize: 8.8, color: C.grey, marginBottom: 18 }}>Site concerné : {SITE.name}, {SITE.address}. Il a été convenu ce qui suit.</Text>

        {ART.map(([t, p], i) => <Article key={t} n={i + 2} t={t} p={p} />)}

        {/* Signatures : jamais coupées */}
        <View break wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: "center", justifyContent: "center", marginRight: 12 }}><Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 10, color: C.blue }}>14</Text></View>
            <Text style={s.h2}>Signatures des parties</Text>
          </View>
          <Text style={{ fontSize: 9, color: C.grey, marginBottom: 10 }}>Fait à Pontoise, le {dateFr("2026-11-05")}, en deux exemplaires. Signature électronique : la version signée et son dossier de preuve sont archivés dans le CRM.</Text>
          <View style={{ backgroundColor: C.light, borderRadius: 6, padding: 14, marginBottom: 14, flexDirection: "row" }}>
            {[["Contrat", "C-2026-0006"], ["Prestation", "Entretien parties communes"], ["Prix mensuel", money(1174.8) + " TTC"], ["Durée", "12 mois reconductibles"]].map(([k, v], i) => (<View key={k} style={{ flex: 1, paddingLeft: i ? 10 : 0 }}><Text style={s.label}>{k}</Text><Text style={{ fontWeight: 600, fontSize: 9.5 }}>{v}</Text></View>))}
          </View>
          <View style={s.row}>
            {[["Pour le Prestataire", "Kevin — Gérant, ProClean Empire"], ["Pour le Client", "Nom, qualité : ____________________"]].map(([k, v], i) => (
              <View key={k} style={{ flex: 1, borderWidth: 1, borderColor: i ? C.blue : C.line, borderRadius: 8, padding: 14, minHeight: 120, marginLeft: i ? 8 : 0, marginRight: i ? 0 : 8 }}>
                <Text style={[s.label, i ? { color: C.blue } : {}]}>{k}</Text>
                <Text style={{ fontSize: 9 }}>{v}</Text>
                <Text style={{ fontSize: 8, color: "#9AA1B1", marginTop: 10 }}>« Lu et approuvé », signature électronique</Text>
                <View style={{ marginTop: 6, height: 38, borderWidth: 0.8, borderStyle: "dashed", borderColor: "#9AA1B1", borderRadius: 4 }} />
              </View>
            ))}
          </View>
        </View>
        <Footer co={CO} doc="Contrat C-2026-0006" />
      </Page>
    </PageShell>
  );
}
