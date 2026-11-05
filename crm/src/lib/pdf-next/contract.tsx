/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { Bar, Body, Multi, C, Company, Footer, Letterhead, PageShell, Party, s } from "./kit";
import { LEGAL_REP, type BuiltContract } from "../contracts/clauses";

/** Texte courant : les passages [ à compléter ] ressortent en bleu. */
function Rich({ t, style }: { t: string; style?: any }) {
  const parts = t.split(/(\[[^\]]+\])/g).filter(Boolean);
  return <Text style={[{ fontSize: 9.6, lineHeight: 1.55, marginBottom: 4 }, style]}>{parts.map((p, i) => /^\[[^\]]+\]$/.test(p) ? <Text key={i} style={{ color: C.blue, fontWeight: 600 }}>{p}</Text> : p)}</Text>;
}

function Art({ n, a }: { n: number; a: BuiltContract["articles"][number] }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View wrap={false} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.blueSoft, alignItems: "center", justifyContent: "center", marginRight: 10 }}><Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 9.5, color: C.blue }}>{n}</Text></View>
        <Text style={[s.h2, { fontSize: 12.5 }]}>Article {n} — {a.title}</Text>
      </View>
      <View style={{ paddingLeft: 34 }}>
        {a.blocks.map((b, i) => (
          <View key={i} wrap={!!b.bullets && b.bullets.length > 3}>
            {b.h ? <Text style={{ fontWeight: 700, fontSize: 9.6, color: C.navy, marginBottom: 2, marginTop: i ? 3 : 0 }}>{b.h}</Text> : null}
            {b.p ? <Rich t={b.p} /> : null}
            {b.bullets?.map((x, j) => <View key={j} style={{ flexDirection: "row" }}><Text style={{ width: 12, fontSize: 9.6, color: C.blue }}>•</Text><Rich t={x} style={{ flex: 1, marginBottom: 2 }} /></View>)}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ContractDoc({ built, co, clientName, signedAt }: { built: BuiltContract; co: Company; clientName: string; signedAt?: string | null }) {
  const label = `Contrat ${built.ref}`;
  return (
    <PageShell co={co} title={`${built.title} — ${clientName}`}>
      <Page size="A4" style={s.page}>
        <Bar />
        <Footer co={co} doc={`${label}  ·  Paraphes ____ / ____`} />
        <Body>
        <Letterhead co={co} title="CONTRAT" number={built.ref} pill={signedAt ? "Signé" : "À signer"} pillTone={signedAt ? "green" : "blue"} />
        <View style={{ backgroundColor: C.navy, borderRadius: 8, padding: 18, marginBottom: 14 }}>
          <Text style={{ color: "#9CC0F5", fontSize: 8, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase" }}>{built.subtitle}</Text>
          <Text style={{ color: C.white, fontFamily: "Jakarta", fontWeight: 800, fontSize: 18, marginTop: 6, lineHeight: 1.2 }}>{built.title}</Text>
        </View>
        <View style={{ flexDirection: "row", backgroundColor: C.light, borderRadius: 6, padding: 13, marginBottom: 18 }}>
          {built.summary.map(([k, v], i) => (<View key={k} style={{ flex: i === 2 ? 2 : 1, paddingLeft: i ? 12 : 0 }}><Text style={s.label}>{k}</Text><Text style={{ fontWeight: 600, fontSize: 9.5 }}>{v}</Text></View>))}
        </View>

        <Text style={[s.h2, { marginBottom: 8 }]}>Entre les soussignés</Text>
        <View style={[s.row, { marginBottom: 6 }]}>
          <Party title="Le Prestataire" lines={[{ t: co.name, b: true }, { t: `${co.legal} au capital de ${co.capital}`.trim() }, { t: co.address }, { t: [co.siret ? `SIRET ${co.siret}` : "", co.rcs].filter(Boolean).join(" · ") }, ...built.parties.provider.slice(1).map((t) => ({ t }))]} />
          <View style={{ width: 12 }} />
          <Party tint title="Le Client" lines={built.parties.client.map((t, i) => ({ t, b: i === 0 }))} />
        </View>
        <Text style={{ fontSize: 9, color: C.grey, marginBottom: 16 }}>{built.parties.place} Il a été convenu ce qui suit.</Text>

        {built.articles.map((a, i) => <Art key={a.title} n={i + 1} a={a} />)}

        </Body>
        <View break wrap={false} style={{ lineHeight: 1.2 }}>
          <Text style={[s.h2, { fontSize: 18, marginBottom: 6 }]}>Signatures</Text>
          <Text style={{ fontSize: 9, color: C.grey, marginBottom: 12 }}>Fait à {"[ ville ]"}, le {"[ date ]"}, en deux exemplaires originaux. Signature électronique : la version signée et son dossier de preuve sont archivés dans le CRM.</Text>
          <View style={s.row}>
            {[["Pour le Prestataire", `${co.name}\n${LEGAL_REP.name}, ${LEGAL_REP.title}`, false], ["Le Client", clientName, true]].map(([k, v, blue], i) => (
              <View key={String(k)} style={{ flex: 1, borderWidth: 1, borderColor: blue ? C.blue : C.line, borderRadius: 8, padding: 14, minHeight: 130, marginLeft: i ? 8 : 0, marginRight: i ? 0 : 8 }}>
                <Text style={[s.label, blue ? { color: C.blue } : {}]}>{String(k)}</Text>
                <Multi text={String(v)} style={{ fontSize: 9.5, fontWeight: 600 }} />
                <Text style={{ fontSize: 8, color: "#9AA1B1", marginTop: 8 }}>« Lu et approuvé », signature électronique</Text>
                <View style={{ marginTop: 6, height: 44, borderWidth: 0.8, borderStyle: "dashed", borderColor: "#9AA1B1", borderRadius: 4 }} />
              </View>
            ))}
          </View>
        </View>
      </Page>
    </PageShell>
  );
}
