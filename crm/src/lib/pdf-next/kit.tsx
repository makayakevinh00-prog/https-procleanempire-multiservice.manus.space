/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "node:path";
import fs from "node:fs";

/** Identité documentaire ProClean Empire — grille, typographie et composants communs aux 3 modèles. */
const fp = (pkg: string, f: string) => path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", f);
Font.register({
  family: "Inter",
  fonts: [
    { src: fp("inter", "inter-latin-400-normal.woff"), fontWeight: 400 },
    { src: fp("inter", "inter-latin-500-normal.woff"), fontWeight: 500 },
    { src: fp("inter", "inter-latin-600-normal.woff"), fontWeight: 600 },
    { src: fp("inter", "inter-latin-700-normal.woff"), fontWeight: 700 }
  ]
});
Font.register({
  family: "Jakarta",
  fonts: [
    { src: fp("plus-jakarta-sans", "plus-jakarta-sans-latin-600-normal.woff"), fontWeight: 600 },
    { src: fp("plus-jakarta-sans", "plus-jakarta-sans-latin-700-normal.woff"), fontWeight: 700 },
    { src: fp("plus-jakarta-sans", "plus-jakarta-sans-latin-800-normal.woff"), fontWeight: 800 }
  ]
});
Font.registerHyphenationCallback((w) => [w]); // jamais de coupure de mot au milieu

export const C = { navy: "#14213D", blue: "#1D6FE0", blueSoft: "#EAF2FD", ink: "#1A1F2E", grey: "#6B7385", light: "#F4F6FA", line: "#E3E7EF", white: "#FFFFFF", green: "#15803D", greenSoft: "#E8F6EE", amber: "#B45309", amberSoft: "#FEF3E2" };
export const M = { x: 42, top: 44, bottom: 84 };

export const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9.5, color: C.ink, paddingTop: M.top, paddingBottom: M.bottom, paddingHorizontal: M.x, lineHeight: 1.45 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: C.navy },
  topBarAccent: { position: "absolute", top: 0, left: 0, width: 96, height: 6, backgroundColor: C.blue },
  label: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.1, color: C.grey, textTransform: "uppercase", marginBottom: 5 },
  h1: { fontFamily: "Jakarta", fontWeight: 800, fontSize: 28, color: C.navy, letterSpacing: 0.6, lineHeight: 1.1 },
  h2: { fontFamily: "Jakarta", fontWeight: 700, fontSize: 13, color: C.navy, lineHeight: 1.25 },
  small: { fontSize: 8.5, color: C.grey },
  bold: { fontWeight: 700 },
  row: { flexDirection: "row" }
});

export const money = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec} €`;
};
export const dateFr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

export interface Company { name: string; address: string; zip: string; city: string; phone: string; email: string; siret: string; vat: string | null; legal: string; capital: string; rcs: string; iban: string | null; web: string }

const LOGO = fs.existsSync(path.join(process.cwd(), "public/logo.png")) ? path.join(process.cwd(), "public/logo.png") : "";

export function Letterhead({ co, title, number, pill, pillTone = "blue" }: { co: Company; title: string; number: string; pill?: string; pillTone?: "blue" | "green" | "amber" }) {
  const tone = { blue: [C.blueSoft, C.blue], green: [C.greenSoft, C.green], amber: [C.amberSoft, C.amber] }[pillTone];
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
      <View style={{ flexDirection: "row", width: "58%" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {LOGO ? <Image src={LOGO} style={{ width: 38, height: 70, marginRight: 14 }} /> : null}
        <View style={{ justifyContent: "center" }}>
          <Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 14, color: C.navy, marginBottom: 4 }}>{co.name}</Text>
          <Text style={s.small}>{co.address}</Text>
          <Text style={s.small}>{co.zip} {co.city}</Text>
          <Text style={s.small}>{co.phone} · {co.email}</Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", width: "40%" }}>
        <Text style={s.h1}>{title}</Text>
        <Text style={{ fontFamily: "Jakarta", fontWeight: 700, fontSize: 12, color: C.blue, marginTop: 7, lineHeight: 1.2 }}>N° {number}</Text>
        {pill ? <View style={{ marginTop: 8, backgroundColor: tone[0], borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 }}><Text style={{ fontSize: 8, fontWeight: 700, color: tone[1], letterSpacing: 0.8, textTransform: "uppercase" }}>{pill}</Text></View> : null}
      </View>
    </View>
  );
}

export function Meta({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 16, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: C.light, borderRadius: 6 }}>
      {items.map(([k, v], i) => (
        <View key={k} style={{ flex: 1, paddingLeft: i ? 12 : 0 }}>
          <Text style={s.label}>{k}</Text>
          <Text style={{ fontWeight: 600, fontSize: 10 }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export function Party({ title, lines, tint = false }: { title: string; lines: { t: string; b?: boolean }[]; tint?: boolean }) {
  return (
    <View style={{ flex: 1, padding: 13, borderRadius: 6, backgroundColor: tint ? C.blueSoft : C.light }}>
      <Text style={[s.label, tint ? { color: C.blue } : {}]}>{title}</Text>
      {lines.map((l, i) => <Text key={i} style={{ fontWeight: l.b ? 700 : 400, fontSize: l.b ? 10.5 : 9, color: l.b ? C.navy : C.ink, marginBottom: 1.5 }}>{l.t}</Text>)}
    </View>
  );
}

export function Footer({ co, doc }: { co: Company; doc: string }) {
  return (
    <View fixed style={{ position: "absolute", left: M.x, right: M.x, bottom: 26, borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
      <View style={{ width: "82%" }}>
        <Text style={{ fontSize: 7.3, color: C.grey, lineHeight: 1.5 }}>
          {co.name} · {co.legal} au capital de {co.capital} · {co.rcs} · SIRET {co.siret}{co.vat ? ` · TVA ${co.vat}` : " · TVA non renseignée"}
        </Text>
        <Text style={{ fontSize: 7.3, color: C.grey }}>{co.address}, {co.zip} {co.city} · {co.phone} · {co.email}</Text>
      </View>
      <Text style={{ fontFamily: "Inter", fontSize: 7.5, color: C.grey }} render={({ pageNumber, totalPages }) => `${doc}  ·  ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function PageShell({ children, co, doc, title }: { children: React.ReactNode; co: Company; doc: string; title: string }) {
  return (
    <Document title={title} author={co.name} creator="ProClean CRM" producer="ProClean CRM">
      {children}
    </Document>
  );
}

export const Bar = () => (<><View fixed style={s.topBar} /><View fixed style={s.topBarAccent} /></>);

/** Cartouche des totaux : le TTC saute aux yeux. */
export function Totals({ ht, byRate, ttc, extra, discount }: { ht: number; byRate: { rate: number; base: number; vat: number }[]; ttc: number; extra?: { label: string; value: string; tone?: "green" }[]; discount?: { label: string; value: number } }) {
  return (
    <View wrap={false} style={{ width: 232, alignSelf: "flex-end" }}>
      {discount ? (<View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}><Text style={{ color: C.grey }}>{discount.label}</Text><Text style={{ color: C.green, fontWeight: 600 }}>{money(-Math.abs(discount.value))}</Text></View>) : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}><Text>Total HT</Text><Text style={{ fontWeight: 600 }}>{money(ht)}</Text></View>
      {byRate.map((r) => (
        <View key={r.rate} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
          <Text style={s.small}>TVA {String(r.rate).replace(".", ",")} % <Text style={{ color: "#9AA1B1" }}>sur {money(r.base)}</Text></Text>
          <Text style={s.small}>{money(r.vat)}</Text>
        </View>
      ))}
      <View style={{ marginTop: 8, backgroundColor: C.navy, borderRadius: 7, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#BFD3F5", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Total TTC</Text>
        <Text style={{ color: C.white, fontFamily: "Jakarta", fontWeight: 800, fontSize: 17 }}>{money(ttc)}</Text>
      </View>
      {extra?.map((e) => (
        <View key={e.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 14 }}>
          <Text style={{ color: e.tone === "green" ? C.green : C.ink, fontWeight: 600 }}>{e.label}</Text>
          <Text style={{ color: e.tone === "green" ? C.green : C.ink, fontWeight: 600 }}>{e.value}</Text>
        </View>
      ))}
    </View>
  );
}
