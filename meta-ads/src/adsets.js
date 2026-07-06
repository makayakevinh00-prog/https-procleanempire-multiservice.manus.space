import { adAccount, bizSdk } from "./client.js";

const { AdSet } = bizSdk;

export async function listAdSets(campaignId) {
  const params = campaignId ? { campaign_id: campaignId } : {};
  const adsets = await adAccount.getAdSets(
    [
      AdSet.Fields.id,
      AdSet.Fields.name,
      AdSet.Fields.status,
      AdSet.Fields.campaign_id,
      AdSet.Fields.daily_budget,
      AdSet.Fields.billing_event,
      AdSet.Fields.optimization_goal
    ],
    params
  );
  return adsets;
}

// targeting: objet targeting Meta (ex. { geo_locations: { cities: [{ key: "..." , radius: 25, distance_unit: "km" }] }, age_min: 25 })
export async function createAdSet({
  name,
  campaignId,
  dailyBudgetCents,
  billingEvent = AdSet.BillingEvent.impressions,
  optimizationGoal = AdSet.OptimizationGoal.lead_generation,
  targeting,
  status = AdSet.Status.paused
}) {
  if (!name || !campaignId || !targeting) {
    throw new Error("createAdSet requiert au minimum { name, campaignId, targeting }");
  }

  const params = {
    [AdSet.Fields.name]: name,
    [AdSet.Fields.campaign_id]: campaignId,
    [AdSet.Fields.billing_event]: billingEvent,
    [AdSet.Fields.optimization_goal]: optimizationGoal,
    [AdSet.Fields.targeting]: targeting,
    [AdSet.Fields.status]: status
  };

  if (dailyBudgetCents) {
    params[AdSet.Fields.daily_budget] = dailyBudgetCents;
  }

  return adAccount.createAdSet([], params);
}

export async function setAdSetStatus(adSetId, status) {
  const adSet = new AdSet(adSetId);
  return adSet.update([], { [AdSet.Fields.status]: status });
}
