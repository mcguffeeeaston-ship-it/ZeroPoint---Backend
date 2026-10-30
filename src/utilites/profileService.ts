import path from "node:path";
import config from "../config";
import logger from "./appLogger";
import ProfileModel from "../models/Profile";
import { isMongoConnected } from "./mongoConnector";

const memoryProfileStore = new Map<string, any>();
let memoryCatalogCosmetics: any = null;

async function loadCosmeticRepository(): Promise<any> {
  if (memoryCatalogCosmetics) return memoryCatalogCosmetics;
  try {
    const assetPath = path.join(process.cwd(), "src", "memory", "all.json");
    const jsonFile = Bun.file(assetPath);
    if (await jsonFile.exists()) {
      memoryCatalogCosmetics = await jsonFile.json();
      logger.info("Loaded global cosmetics repository");
    } else {
      memoryCatalogCosmetics = {};
    }
  } catch (err: any) {
    logger.error(`Cosmetics catalog error: ${err.message}`);
    memoryCatalogCosmetics = {};
  }
  return memoryCatalogCosmetics;
}

export class ProfileDataManager {
  static async fetchTemplate(profileId: string): Promise<any> {
    try {
      const templatePath = path.join(process.cwd(), "src", "memory", "profiles", `${profileId}.json`);
      const file = Bun.file(templatePath);
      if (await file.exists()) {
        return await file.json();
      }
    } catch (err: any) {
      logger.error(`Template read failure for ${profileId}: ${err.message}`);
    }

    return {
      _id: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rvn: 1,
      wipeNumber: 1,
      accountId: "",
      profileId,
      version: "zeropoint_season9",
      items: {},
      stats: { attributes: {} },
      commandRevision: 1,
    };
  }

  static async retrieveProfile(accountId: string, profileId: string): Promise<any> {
    const cacheKey = `${accountId}:${profileId}`;
    if (memoryProfileStore.has(cacheKey)) {
      return memoryProfileStore.get(cacheKey);
    }

    let profileData: any = null;

    if (isMongoConnected()) {
      try {
        const found = await ProfileModel.findOne({ accountId, profileId });
        if (found) {
          profileData = found.data;
          profileData.rvn = found.rvn;
          profileData.commandRevision = found.commandRevision;
        }
      } catch (err: any) {
        logger.error(`Database retrieval error: ${err.message}`);
      }
    }

    if (!profileData) {
      profileData = await this.fetchTemplate(profileId);
      profileData.accountId = accountId;
      profileData.createdAt = new Date().toISOString();
      profileData.updatedAt = new Date().toISOString();
      profileData.rvn = 1;
      profileData.commandRevision = 1;

      if (profileId === "common_core") {
        if (!profileData.items) profileData.items = {};
        profileData.items["Currency:MtxPurchased"] = {
          templateId: "Currency:MtxPurchased",
          attributes: { platform: "EpicPC" },
          quantity: config.defaultVbucks,
        };
      }

      if (profileId === "athena") {
        if (!profileData.stats) profileData.stats = { attributes: {} };
        if (!profileData.stats.attributes) profileData.stats.attributes = {};
        profileData.stats.attributes.season_num = config.defaultSeason;

        if (config.grantAllCosmetics) {
          const allItems = await loadCosmeticRepository();
          profileData.items = {
            ...allItems,
            ...(profileData.items || {}),
          };
        }
      }

      await this.commitProfile(accountId, profileId, profileData);
    }

    memoryProfileStore.set(cacheKey, profileData);
    return profileData;
  }

  static async commitProfile(accountId: string, profileId: string, profile: any): Promise<void> {
    const cacheKey = `${accountId}:${profileId}`;
    profile.updatedAt = new Date().toISOString();
    memoryProfileStore.set(cacheKey, profile);

    if (isMongoConnected()) {
      try {
        await ProfileModel.findOneAndUpdate(
          { accountId, profileId },
          {
            accountId,
            profileId,
            rvn: profile.rvn || 1,
            commandRevision: profile.commandRevision || 1,
            data: profile,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch (err: any) {
        logger.error(`Profile commit error: ${err.message}`);
      }
    }
  }
}

export default ProfileDataManager;
