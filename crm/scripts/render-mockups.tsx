import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import { InvoiceDoc } from "../src/lib/pdf-next/invoice";
import { QuoteDoc } from "../src/lib/pdf-next/quote";
import { ContractDoc } from "../src/lib/pdf-next/contract";

const out = process.argv[2] ?? "/tmp";
(async () => {
  await renderToFile(<InvoiceDoc paid={500} lines={[
    { title: "Entretien des parties communes", detail: "Halls, escaliers, ascenseurs — bâtiments A et B", date: "Octobre 2026", qty: 12, unit: "passages", pu: 145, vat: 20 },
    { title: "Nettoyage de la vitrerie", detail: "Vitres du hall et cages d'escalier, intérieur", date: "14/10/2026", qty: 1, unit: "forfait", pu: 220, vat: 20 },
    { title: "Évacuation des encombrants", detail: "Local poubelles, caves communes", date: "21/10/2026", qty: 1, unit: "forfait", pu: 160, vat: 20 }
  ]} />, `${out}/maquette-facture.pdf`);
  await renderToFile(<QuoteDoc />, `${out}/maquette-devis.pdf`);
  await renderToFile(<ContractDoc />, `${out}/maquette-contrat.pdf`);
  console.log("ok");
})();
