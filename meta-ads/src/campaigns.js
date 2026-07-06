import { adAccount, bizSdk } from "./client.js";

const { Campaign } = bizSdk;

export async function listCampaigns() {
  const campaigns = await adAccount.getCampaigns([
    Campaign.Fields.id,
    Campaign.Fields.name,
    Campaign.Fields.status,
    Campaign.Fields.objective,
    Campaign.Fields.daily_budget
  ]);
  return campaigns;
}

// objective: une valeur de Campaign.Objective, ex. OUTCOME_LEADS, OUTCOME_TRAFFIC, OUTCOME_AWARENESS
// dailyBudgetCents: budget quotidien en centimes (ex. 2000 = 20,00 EUR)
export async function createCampaign({ name, objective, dailyBudgetCents, status = Campaign.Status.paused }) {
  if (!name || !objective) {
    throw new Error("createCampaign requiert au minimum { name, objective }");
  }

  const params = {
    [Campaign.Fields.name]: name,
    [Campaign.Fields.objective]: objective,
    [Campaign.Fields.status]: status,
    special_ad_categories: []
  };

  if (dailyBudgetCents) {
    params[Campaign.Fields.daily_budget] = dailyBudgetCents;
  }

  const campaign = await adAccount.createCampaign([], params);
  return campaign;
}

export async function setCampaignStatus(campaignId, status) {
  const campaign = new Campaign(campaignId);
  return campaign.update([], { [Campaign.Fields.status]: status });
}
