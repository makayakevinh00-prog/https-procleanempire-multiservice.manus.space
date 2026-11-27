import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { companyFrom } from "./kit";
import { InvoiceDoc } from "./invoice";
import { QuoteDoc } from "./quote";
import { ContractDoc } from "./contract";
import { buildContract, type ContractInput } from "../contracts/clauses";
import { buildEntrepreneurContract, type EntrepreneurInput } from "../contracts/entrepreneur";
import type { PdfDoc } from "../pdf/document";

/** Génération PDF « haut de gamme » (react-pdf, polices intégrées). */
export async function renderInvoiceOrQuote(doc: PdfDoc, settings: any): Promise<Uint8Array> {
  const co = companyFrom(settings);
  const days = Number(settings.payment_terms_days ?? 30);
  const el = doc.kind === "devis" ? React.createElement(QuoteDoc, { doc, co, paymentDays: days }) : React.createElement(InvoiceDoc, { doc, co, paymentDays: days });
  return new Uint8Array(await renderToBuffer(el as any));
}

/** Contrat de sous-traitance avec un entrepreneur indépendant (ProClean Empire = Donneur d'ordre). */
export async function renderEntrepreneurContractPdf(input: EntrepreneurInput, settings: any): Promise<Uint8Array> {
  const co = companyFrom(settings);
  const built = buildEntrepreneurContract(input);
  return new Uint8Array(await renderToBuffer(React.createElement(ContractDoc, { built, co, clientName: input.name?.trim() || "[ nom de l'entrepreneur ]" }) as any));
}

export async function renderContractPdf(input: ContractInput, settings: any, clientName: string, signedAt?: string | null): Promise<Uint8Array> {
  const co = companyFrom(settings);
  return new Uint8Array(await renderToBuffer(React.createElement(ContractDoc, { built: buildContract(input), co, clientName, signedAt }) as any));
}
