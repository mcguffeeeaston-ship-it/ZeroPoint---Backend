import type { Context } from "hono";
import ProfileDataManager from "../utilites/profileService";
import McpEnvelopeFormatter from "../utilites/mcpFormatter";
import parseUserAgent from "../utilites/agentParser";
import EpicServiceError from "../utilites/serviceErrors";
import XmppSessionRegistry from "../utilites/xmppRegistry";

export async function handleQueryProfile(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";
  const rvn = parseInt(c.req.query("rvn") || "-1", 10);
  const ua = parseUserAgent(c.req.header("User-Agent"));

  if (!accountId) {
    return c.json(EpicServiceError.badRequest("Missing accountId"), 400);
  }

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) {
    return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);
  }

  if (profileId === "athena") {
    if (!profile.stats) profile.stats = { attributes: {} };
    if (!profile.stats.attributes) profile.stats.attributes = {};

    profile.stats.attributes.season_num = ua.season || 9;

    let pastSeasons = profile.stats.attributes.past_seasons || [];
    const currentSeasonEntry = pastSeasons.find((s: any) => s.seasonNumber === (ua.season || 9));
    if (!currentSeasonEntry) {
      pastSeasons.push({
        seasonNumber: ua.season || 9,
        numWins: 0,
        numHighBracket: 0,
        numLowBracket: 0,
        seasonXp: 0,
        seasonLevel: 1,
        bookXp: 0,
        bookLevel: 1,
        purchasedVIP: true,
        numRoyalRoyales: 0,
        survivorTier: 0,
        survivorPrestige: 0,
      });
      profile.stats.attributes.past_seasons = pastSeasons;
      profile.stats.attributes.book_purchased = true;
      await ProfileDataManager.commitProfile(accountId, "athena", profile);
    }
  }

  const changes: object[] = [];
  if (rvn !== profile.rvn) {
    changes.push({
      changeType: "fullProfileUpdate",
      profile,
    });
  }

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, changes, profileId));
}

export async function handleClientQuestLogin(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) {
    return c.json(EpicServiceError.badRequest("Missing accountId"), 400);
  }

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) {
    return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  profile.updatedAt = new Date().toISOString();

  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(
    McpEnvelopeFormatter.createEnvelope(
      profile,
      [
        {
          changeType: "fullProfileUpdate",
          profile,
        },
      ],
      profileId
    )
  );
}

export async function handleEquipBattleRoyaleCustomization(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) {
    return c.json(EpicServiceError.badRequest("Missing accountId"), 400);
  }

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) {
    return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json(EpicServiceError.badRequest("Invalid request body"), 400);
  }

  const { slotName, itemToSlot, indexWithinSlot, variantUpdates } = body;
  const applyProfileChanges: object[] = [];

  if (!profile.stats) profile.stats = { attributes: {} };
  if (!profile.stats.attributes) profile.stats.attributes = {};

  const activeLoadout = profile.stats.attributes.last_applied_loadout || "sandbox_loadout";
  const loadout = profile.items?.[activeLoadout];
  const slotKey = `favorite_${slotName?.toLowerCase()}`;

  if (slotName === "Dance") {
    if (!profile.stats.attributes.favorite_dance) {
      profile.stats.attributes.favorite_dance = ["", "", "", "", "", ""];
    }
    const idx = typeof indexWithinSlot === "number" && indexWithinSlot >= 0 && indexWithinSlot <= 5 ? indexWithinSlot : 0;
    profile.stats.attributes.favorite_dance[idx] = itemToSlot;

    if (loadout?.attributes?.locker_slots_data?.slots?.Dance) {
      loadout.attributes.locker_slots_data.slots.Dance.items[idx] = itemToSlot;
    }

    applyProfileChanges.push({
      changeType: "statModified",
      name: "favorite_dance",
      value: profile.stats.attributes.favorite_dance,
    });
  } else if (slotName === "ItemWrap") {
    if (!profile.stats.attributes.favorite_itemwraps) {
      profile.stats.attributes.favorite_itemwraps = ["", "", "", "", "", "", ""];
    }
    const idx = typeof indexWithinSlot === "number" && indexWithinSlot >= 0 ? indexWithinSlot : -1;
    if (idx === -1) {
      profile.stats.attributes.favorite_itemwraps.fill(itemToSlot);
      if (loadout?.attributes?.locker_slots_data?.slots?.ItemWrap) {
        loadout.attributes.locker_slots_data.slots.ItemWrap.items.fill(itemToSlot);
      }
    } else {
      profile.stats.attributes.favorite_itemwraps[idx] = itemToSlot;
      if (loadout?.attributes?.locker_slots_data?.slots?.ItemWrap) {
        loadout.attributes.locker_slots_data.slots.ItemWrap.items[idx] = itemToSlot;
      }
    }
    applyProfileChanges.push({
      changeType: "statModified",
      name: "favorite_itemwraps",
      value: profile.stats.attributes.favorite_itemwraps,
    });
  } else {
    profile.stats.attributes[slotKey] = itemToSlot;

    if (loadout?.attributes?.locker_slots_data?.slots?.[slotName]) {
      loadout.attributes.locker_slots_data.slots[slotName].items = [itemToSlot];
    }

    applyProfileChanges.push({
      changeType: "statModified",
      name: slotKey,
      value: itemToSlot,
    });
  }

  if (variantUpdates && Array.isArray(variantUpdates) && profile.items?.[itemToSlot]) {
    profile.items[itemToSlot].attributes = profile.items[itemToSlot].attributes || {};
    profile.items[itemToSlot].attributes.variants = variantUpdates;

    applyProfileChanges.push({
      changeType: "itemAttrChanged",
      itemId: itemToSlot,
      attributeName: "variants",
      attributeValue: variantUpdates,
    });
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleSetCosmeticLockerSlot(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) {
    return c.json(EpicServiceError.badRequest("Missing accountId"), 400);
  }

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) {
    return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json(EpicServiceError.badRequest("Invalid request body"), 400);
  }

  const { lockerItem, category, itemToSlot, slotIndex, variantUpdates } = body;
  const applyProfileChanges: object[] = [];

  const locker = profile.items?.[lockerItem];
  if (locker && locker.attributes && locker.attributes.locker_slots_data) {
    const slots = locker.attributes.locker_slots_data.slots;
    if (slots && slots[category]) {
      if (category === "Dance") {
        const idx = typeof slotIndex === "number" && slotIndex >= 0 ? slotIndex : 0;
        slots.Dance.items[idx] = itemToSlot;
      } else if (category === "ItemWrap") {
        if (typeof slotIndex === "number" && slotIndex >= 0) {
          slots.ItemWrap.items[slotIndex] = itemToSlot;
        } else {
          slots.ItemWrap.items.fill(itemToSlot);
        }
      } else {
        slots[category].items = [itemToSlot];
      }

      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: lockerItem,
        attributeName: "locker_slots_data",
        attributeValue: locker.attributes.locker_slots_data,
      });
    }
  }

  if (variantUpdates && Array.isArray(variantUpdates) && profile.items?.[itemToSlot]) {
    profile.items[itemToSlot].attributes = profile.items[itemToSlot].attributes || {};
    profile.items[itemToSlot].attributes.variants = variantUpdates;

    applyProfileChanges.push({
      changeType: "itemAttrChanged",
      itemId: itemToSlot,
      attributeName: "variants",
      attributeValue: variantUpdates,
    });
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleSetBattleRoyaleBanner(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { homebaseBannerIconId, homebaseBannerColorId } = body;
  const applyProfileChanges: object[] = [];

  if (!profile.stats) profile.stats = { attributes: {} };
  if (!profile.stats.attributes) profile.stats.attributes = {};

  if (homebaseBannerIconId) {
    profile.stats.attributes.banner_icon = homebaseBannerIconId;
    applyProfileChanges.push({
      changeType: "statModified",
      name: "banner_icon",
      value: homebaseBannerIconId,
    });
  }

  if (homebaseBannerColorId) {
    profile.stats.attributes.banner_color = homebaseBannerColorId;
    applyProfileChanges.push({
      changeType: "statModified",
      name: "banner_color",
      value: homebaseBannerColorId,
    });
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleSetItemFavoriteStatus(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { targetItemId, bFavorite } = body;
  const applyProfileChanges: object[] = [];

  if (profile.items?.[targetItemId]) {
    profile.items[targetItemId].attributes = profile.items[targetItemId].attributes || {};
    profile.items[targetItemId].attributes.favorite = !!bFavorite;

    applyProfileChanges.push({
      changeType: "itemAttrChanged",
      itemId: targetItemId,
      attributeName: "favorite",
      attributeValue: !!bFavorite,
    });
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleSetItemFavoriteStatusBatch(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { itemIds, itemFavStatus } = body;
  const applyProfileChanges: object[] = [];

  if (Array.isArray(itemIds) && Array.isArray(itemFavStatus)) {
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const isFav = !!itemFavStatus[i];
      if (profile.items?.[itemId]) {
        profile.items[itemId].attributes = profile.items[itemId].attributes || {};
        profile.items[itemId].attributes.favorite = isFav;
        applyProfileChanges.push({
          changeType: "itemAttrChanged",
          itemId,
          attributeName: "favorite",
          attributeValue: isFav,
        });
      }
    }
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleMarkItemSeen(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { itemIds } = body;
  const applyProfileChanges: object[] = [];

  if (Array.isArray(itemIds)) {
    for (const itemId of itemIds) {
      if (profile.items?.[itemId]) {
        profile.items[itemId].attributes = profile.items[itemId].attributes || {};
        profile.items[itemId].attributes.item_seen = true;
        applyProfileChanges.push({
          changeType: "itemAttrChanged",
          itemId,
          attributeName: "item_seen",
          attributeValue: true,
        });
      }
    }
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handlePurchaseCatalogEntry(c: Context) {
  const accountId = c.req.param("accountId");

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const commonCore = await ProfileDataManager.retrieveProfile(accountId, "common_core");
  const athena = await ProfileDataManager.retrieveProfile(accountId, "athena");

  if (!commonCore || !athena) {
    return c.json(EpicServiceError.notFound("Profile not found"), 404);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { offerId, expectedTotalPrice = 0 } = body;
  const applyProfileChanges: object[] = [];
  const lootResult: object[] = [];

  const mtx = commonCore.items?.["Currency:MtxPurchased"];
  if (mtx) {
    const cost = Math.max(0, expectedTotalPrice);
    mtx.quantity = Math.max(0, (mtx.quantity || 0) - cost);
    applyProfileChanges.push({
      changeType: "itemQuantityChanged",
      itemId: "Currency:MtxPurchased",
      quantity: mtx.quantity,
    });
  }

  const isBattlePass = typeof offerId === "string" && (offerId.toLowerCase().includes("battlepass") || offerId.toLowerCase().includes("bp"));
  if (isBattlePass && athena.stats?.attributes) {
    athena.stats.attributes.book_purchased = true;
    athena.stats.attributes.book_level = Math.max(athena.stats.attributes.book_level || 1, 1);
  }

  commonCore.rvn = (commonCore.rvn || 0) + 1;
  commonCore.commandRevision = (commonCore.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, "common_core", commonCore);

  athena.rvn = (athena.rvn || 0) + 1;
  athena.commandRevision = (athena.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, "athena", athena);

  return c.json(
    McpEnvelopeFormatter.createPurchaseEnvelope(
      commonCore,
      athena,
      applyProfileChanges,
      lootResult,
      "common_core"
    )
  );
}

export async function handleClaimMfaEnabled(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "common_core";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  const athena = await ProfileDataManager.retrieveProfile(accountId, "athena");

  if (!profile) return c.json(EpicServiceError.notFound("Profile not found"), 404);

  const applyProfileChanges: object[] = [];

  if (profile.stats?.attributes) {
    profile.stats.attributes.mfa_enabled = true;
    applyProfileChanges.push({
      changeType: "statModified",
      name: "mfa_enabled",
      value: true,
    });
  }

  if (athena && athena.items) {
    const boogieDown = "AthenaDance:eid_boogiedown";
    if (!athena.items[boogieDown]) {
      athena.items[boogieDown] = {
        templateId: boogieDown,
        attributes: {
          favorite: false,
          item_seen: false,
          level: 1,
          variants: [],
        },
        quantity: 1,
      };
      await ProfileDataManager.commitProfile(accountId, "athena", athena);
    }
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleGiftCatalogEntry(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "common_core";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound("Profile not found"), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { receiverAccountIds = [], giftWrapTemplateId, personalMessage } = body;
  const applyProfileChanges: object[] = [];

  const mtx = profile.items?.["Currency:MtxPurchased"];
  if (mtx && body.expectedTotalPrice) {
    mtx.quantity = Math.max(0, (mtx.quantity || 0) - body.expectedTotalPrice);
    applyProfileChanges.push({
      changeType: "itemQuantityChanged",
      itemId: "Currency:MtxPurchased",
      quantity: mtx.quantity,
    });
  }

  for (const receiverId of receiverAccountIds) {
    const receiverCore = await ProfileDataManager.retrieveProfile(receiverId, "common_core");
    if (receiverCore && receiverCore.items) {
      const giftBoxId = `GiftBox:${crypto.randomUUID()}`;
      receiverCore.items[giftBoxId] = {
        templateId: giftWrapTemplateId || "GiftBox:GB_Default",
        attributes: {
          fromAccountId: accountId,
          userMessage: personalMessage || "ZeroPoint by Nyxa Gift",
          giftedOn: new Date().toISOString(),
          params: {},
        },
        quantity: 1,
      };
      await ProfileDataManager.commitProfile(receiverId, "common_core", receiverCore);

      XmppSessionRegistry.dispatchPayloadToAccountId(receiverId, {
        type: "com.epicgames.gift.received",
        payload: {},
        timestamp: new Date().toISOString(),
      });
    }
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleRemoveGiftBox(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "common_core";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound("Profile not found"), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { giftBoxItemIds = [] } = body;
  const applyProfileChanges: object[] = [];

  for (const giftBoxId of giftBoxItemIds) {
    if (profile.items?.[giftBoxId]) {
      delete profile.items[giftBoxId];
      applyProfileChanges.push({
        changeType: "itemRemoved",
        itemId: giftBoxId,
      });
    }
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleBulkEquipBattleRoyaleCustomization(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "athena";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound(`Profile '${profileId}' not found`), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { loadoutData } = body;
  const applyProfileChanges: object[] = [];

  if (loadoutData && Array.isArray(loadoutData)) {
    for (const item of loadoutData) {
      const slotName = item.slotName;
      const itemToSlot = item.itemToSlot;
      const slotKey = `favorite_${slotName?.toLowerCase()}`;
      if (profile.stats?.attributes && slotKey) {
        profile.stats.attributes[slotKey] = itemToSlot;
        applyProfileChanges.push({
          changeType: "statModified",
          name: slotKey,
          value: itemToSlot,
        });
      }
    }
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export async function handleSetMtxPlatform(c: Context) {
  const accountId = c.req.param("accountId");
  const profileId = c.req.query("profileId") || "common_core";

  if (!accountId) return c.json(EpicServiceError.badRequest("Missing accountId"), 400);

  const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
  if (!profile) return c.json(EpicServiceError.notFound("Profile not found"), 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(EpicServiceError.badRequest("Invalid request body"), 400);

  const { newPlatform = "EpicPC" } = body;
  const applyProfileChanges: object[] = [];

  if (profile.stats?.attributes) {
    profile.stats.attributes.current_mtx_platform = newPlatform;
    applyProfileChanges.push({
      changeType: "statModified",
      name: "current_mtx_platform",
      value: newPlatform,
    });
  }

  profile.rvn = (profile.rvn || 0) + 1;
  profile.commandRevision = (profile.commandRevision || 0) + 1;
  await ProfileDataManager.commitProfile(accountId, profileId, profile);

  return c.json(McpEnvelopeFormatter.createEnvelope(profile, applyProfileChanges, profileId));
}

export const registeredOperations: Record<string, (c: Context) => Promise<any>> = {
  QueryProfile: handleQueryProfile,
  ClientQuestLogin: handleClientQuestLogin,
  EquipBattleRoyaleCustomization: handleEquipBattleRoyaleCustomization,
  SetCosmeticLockerSlot: handleSetCosmeticLockerSlot,
  SetBattleRoyaleBanner: handleSetBattleRoyaleBanner,
  SetItemFavoriteStatus: handleSetItemFavoriteStatus,
  SetItemFavoriteStatusBatch: handleSetItemFavoriteStatusBatch,
  MarkItemSeen: handleMarkItemSeen,
  PurchaseCatalogEntry: handlePurchaseCatalogEntry,
  ClaimMfaEnabled: handleClaimMfaEnabled,
  GiftCatalogEntry: handleGiftCatalogEntry,
  RemoveGiftBox: handleRemoveGiftBox,
  BulkEquipBattleRoyaleCustomization: handleBulkEquipBattleRoyaleCustomization,
  SetMtxPlatform: handleSetMtxPlatform,
};

export default registeredOperations;
