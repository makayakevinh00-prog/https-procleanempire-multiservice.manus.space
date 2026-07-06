import dotenv from "dotenv";
import bizSdk from "facebook-nodejs-business-sdk";

dotenv.config();

const { FacebookAdsApi, AdAccount } = bizSdk;

const accessToken = process.env.META_ACCESS_TOKEN;
const adAccountId = process.env.META_AD_ACCOUNT_ID;

if (!accessToken) {
  throw new Error("META_ACCESS_TOKEN manquant. Copie meta-ads/.env.example vers meta-ads/.env et renseigne-le.");
}
if (!adAccountId) {
  throw new Error("META_AD_ACCOUNT_ID manquant (format act_XXXXXXXXXX). Renseigne-le dans meta-ads/.env.");
}

const api = FacebookAdsApi.init(accessToken);
if (process.env.META_API_VERSION) {
  api.setApiVersion(process.env.META_API_VERSION);
}

export const adAccount = new AdAccount(adAccountId);
export { bizSdk };
