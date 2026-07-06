import { adAccount, bizSdk } from "./client.js";

const { Ad, AdCreative } = bizSdk;

export async function listAds(adSetId) {
  const params = adSetId ? { adset_id: adSetId } : {};
  const ads = await adAccount.getAds(
    [Ad.Fields.id, Ad.Fields.name, Ad.Fields.status, Ad.Fields.adset_id, Ad.Fields.creative],
    params
  );
  return ads;
}

// Cree une creative "lien" simple (image + texte + bouton) pointant vers une page du site.
// pageId: ID de la Page Facebook liee au compte pub (Business Settings > Pages)
// imageHash: hash d'une image deja uploadee via adAccount.createAdImage
export async function createLinkAdCreative({ pageId, message, link, headline, imageHash, callToActionType = "LEARN_MORE" }) {
  if (!pageId || !link) {
    throw new Error("createLinkAdCreative requiert au minimum { pageId, link }");
  }

  const objectStorySpec = {
    page_id: pageId,
    link_data: {
      message,
      link,
      name: headline,
      image_hash: imageHash,
      call_to_action: { type: callToActionType }
    }
  };

  const params = {
    [AdCreative.Fields.object_story_spec]: objectStorySpec
  };

  return adAccount.createAdCreative([], params);
}

export async function createAd({ name, adSetId, creativeId, status = Ad.Status.paused }) {
  if (!name || !adSetId || !creativeId) {
    throw new Error("createAd requiert au minimum { name, adSetId, creativeId }");
  }

  const params = {
    [Ad.Fields.name]: name,
    [Ad.Fields.adset_id]: adSetId,
    [Ad.Fields.creative]: { creative_id: creativeId },
    [Ad.Fields.status]: status
  };

  return adAccount.createAd([], params);
}

export async function setAdStatus(adId, status) {
  const ad = new Ad(adId);
  return ad.update([], { [Ad.Fields.status]: status });
}
