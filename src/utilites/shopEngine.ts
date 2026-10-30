import path from "node:path";
import { createHash } from "node:crypto";

export interface ShopItemConfig {
  templateId: string;
  price: number;
  name: string;
}

export interface CatalogStorefrontEntry {
  devName: string;
  offerId: string;
  fulfillmentIds: string[];
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  categories: string[];
  prices: Array<{
    currencyType: string;
    currencySubType: string;
    regularPrice: number;
    finalPrice: number;
    saleExpiration: string;
    basePrice: number;
  }>;
  meta: Record<string, any>;
  matchFilter: string;
  filterWeight: number;
  appStoreId: string[];
  requirements: Array<{
    requirementType: string;
    requiredId: string;
    minQuantity: number;
  }>;
  offerType: string;
  giftInfo: {
    bIsEnabled: boolean;
    forcedGiftBoxTemplateId: string;
    purchaseRequirements: any[];
    giftRecordIds: any[];
  };
  refundable: boolean;
  metaInfo: Array<{ key: string; value: string }>;
  displayAssetPath: string;
  itemGrants: Array<{ templateId: string; quantity: number }>;
  sortPriority: number;
  catalogGroupPriority: number;
}

const registeredOffers = new Map<string, CatalogStorefrontEntry>();

function generateOfferHash(templateId: string, section: string): string {
  return "v2:/" + createHash("sha1").update(`${section}_${templateId}`).digest("hex");
}

function constructEntry(item: ShopItemConfig, section: "Featured" | "Daily", priority: number): CatalogStorefrontEntry {
  const offerId = generateOfferHash(item.templateId, section);
  const expirationDate = "9999-12-31T23:59:59.999Z";

  const entry: CatalogStorefrontEntry = {
    devName: `[VIRTUAL] 1 x ${item.name} for ${item.price} MtxCurrency`,
    offerId,
    fulfillmentIds: [],
    dailyLimit: -1,
    weeklyLimit: -1,
    monthlyLimit: -1,
    categories: [section === "Featured" ? "Panel 1" : "Panel 2"],
    prices: [
      {
        currencyType: "MtxCurrency",
        currencySubType: "",
        regularPrice: item.price,
        finalPrice: item.price,
        saleExpiration: expirationDate,
        basePrice: item.price,
      },
    ],
    meta: {
      SectionId: section,
      TileSize: section === "Featured" ? "Normal" : "Small",
    },
    matchFilter: "",
    filterWeight: 0,
    appStoreId: [],
    requirements: [
      {
        requirementType: "DenyOnItemOwnership",
        requiredId: item.templateId,
        minQuantity: 1,
      },
    ],
    offerType: "StaticPrice",
    giftInfo: {
      bIsEnabled: true,
      forcedGiftBoxTemplateId: "",
      purchaseRequirements: [],
      giftRecordIds: [],
    },
    refundable: true,
    metaInfo: [
      { key: "SectionId", value: section },
      { key: "TileSize", value: section === "Featured" ? "Normal" : "Small" },
    ],
    displayAssetPath: `/Game/Catalog/DisplayAssets/DA_${item.templateId.replace(":", "_")}.DA_${item.templateId.replace(":", "_")}`,
    itemGrants: [
      {
        templateId: item.templateId,
        quantity: 1,
      },
    ],
    sortPriority: priority,
    catalogGroupPriority: 0,
  };

  registeredOffers.set(offerId, entry);
  return entry;
}

export class ShopEngine {
  static async loadCatalogStorefronts(): Promise<any[]> {
    registeredOffers.clear();
    const configPath = path.join(process.cwd(), "src", "memory", "storefront", "shop_config.json");
    let shopData = { daily: [] as ShopItemConfig[], featured: [] as ShopItemConfig[] };

    try {
      const file = Bun.file(configPath);
      if (await file.exists()) {
        shopData = await file.json();
      }
    } catch {}

    const dailyEntries: CatalogStorefrontEntry[] = [];
    let dailyPriority = 1;
    for (const item of shopData.daily || []) {
      dailyEntries.push(constructEntry(item, "Daily", dailyPriority++));
    }

    const featuredEntries: CatalogStorefrontEntry[] = [];
    let featuredPriority = 1;
    for (const item of shopData.featured || []) {
      featuredEntries.push(constructEntry(item, "Featured", featuredPriority++));
    }

    return [
      {
        name: "BRWeeklyStorefront",
        catalogEntries: featuredEntries,
      },
      {
        name: "BRDailyStorefront",
        catalogEntries: dailyEntries,
      },
    ];
  }

  static findOffer(offerId: string): CatalogStorefrontEntry | undefined {
    return registeredOffers.get(offerId);
  }
}

export default ShopEngine;
