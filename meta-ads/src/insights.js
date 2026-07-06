import { adAccount } from "./client.js";

// level: "campaign" | "adset" | "ad" | "account"
// datePreset: "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | ... (ignore si since/until fournis)
export async function getInsights({ level = "campaign", since, until, datePreset = "last_7d" } = {}) {
  const params = {
    level,
    fields: [
      "campaign_name",
      "adset_name",
      "ad_name",
      "spend",
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "actions"
    ]
  };

  if (since && until) {
    params.time_range = { since, until };
  } else {
    params.date_preset = datePreset;
  }

  const insights = await adAccount.getInsights([], params);
  return insights;
}
