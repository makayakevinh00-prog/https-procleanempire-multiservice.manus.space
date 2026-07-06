#!/usr/bin/env node
import { Command } from "commander";
import { listCampaigns, createCampaign, setCampaignStatus } from "./campaigns.js";
import { listAdSets, createAdSet, setAdSetStatus } from "./adsets.js";
import { listAds } from "./ads.js";
import { getInsights } from "./insights.js";

const program = new Command();
program.name("meta-ads").description("CLI de gestion des campagnes Meta Ads ProClean Empire");

program
  .command("campaigns:list")
  .description("Liste les campagnes du compte publicitaire")
  .action(async () => {
    const campaigns = await listCampaigns();
    console.log(JSON.stringify(campaigns, null, 2));
  });

program
  .command("campaigns:create")
  .description("Cree une campagne (en pause par defaut)")
  .requiredOption("--name <name>", "Nom de la campagne")
  .requiredOption("--objective <objective>", "Objectif Meta, ex. OUTCOME_LEADS, OUTCOME_TRAFFIC, OUTCOME_AWARENESS")
  .option("--daily-budget <cents>", "Budget quotidien en centimes, ex. 2000 pour 20,00 EUR", parseInt)
  .action(async (opts) => {
    const campaign = await createCampaign({
      name: opts.name,
      objective: opts.objective,
      dailyBudgetCents: opts.dailyBudget
    });
    console.log(JSON.stringify(campaign, null, 2));
  });

program
  .command("campaigns:status")
  .description("Change le statut d'une campagne")
  .requiredOption("--id <id>", "ID de la campagne")
  .requiredOption("--status <status>", "ACTIVE | PAUSED | ARCHIVED | DELETED")
  .action(async (opts) => {
    const result = await setCampaignStatus(opts.id, opts.status);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("adsets:list")
  .description("Liste les ad sets, filtrable par campagne")
  .option("--campaign-id <id>", "Filtrer par ID de campagne")
  .action(async (opts) => {
    const adsets = await listAdSets(opts.campaignId);
    console.log(JSON.stringify(adsets, null, 2));
  });

program
  .command("adsets:create")
  .description("Cree un ad set (en pause par defaut). Le ciblage doit etre fourni en JSON.")
  .requiredOption("--name <name>", "Nom de l'ad set")
  .requiredOption("--campaign-id <id>", "ID de la campagne parente")
  .requiredOption("--targeting <json>", "Ciblage Meta au format JSON, ex. '{\"geo_locations\":{\"countries\":[\"FR\"]}}'")
  .option("--daily-budget <cents>", "Budget quotidien en centimes", parseInt)
  .action(async (opts) => {
    const adSet = await createAdSet({
      name: opts.name,
      campaignId: opts.campaignId,
      targeting: JSON.parse(opts.targeting),
      dailyBudgetCents: opts.dailyBudget
    });
    console.log(JSON.stringify(adSet, null, 2));
  });

program
  .command("adsets:status")
  .description("Change le statut d'un ad set")
  .requiredOption("--id <id>", "ID de l'ad set")
  .requiredOption("--status <status>", "ACTIVE | PAUSED | ARCHIVED | DELETED")
  .action(async (opts) => {
    const result = await setAdSetStatus(opts.id, opts.status);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("ads:list")
  .description("Liste les ads, filtrable par ad set")
  .option("--adset-id <id>", "Filtrer par ID d'ad set")
  .action(async (opts) => {
    const ads = await listAds(opts.adsetId);
    console.log(JSON.stringify(ads, null, 2));
  });

program
  .command("insights")
  .description("Recupere les performances (depenses, clics, conversions)")
  .option("--level <level>", "campaign | adset | ad | account", "campaign")
  .option("--since <date>", "Date de debut YYYY-MM-DD")
  .option("--until <date>", "Date de fin YYYY-MM-DD")
  .option("--date-preset <preset>", "today | yesterday | last_7d | last_30d | this_month", "last_7d")
  .action(async (opts) => {
    const insights = await getInsights({
      level: opts.level,
      since: opts.since,
      until: opts.until,
      datePreset: opts.datePreset
    });
    console.log(JSON.stringify(insights, null, 2));
  });

program.parseAsync(process.argv);
