export interface FormattedProfileEnvelope {
  profileRevision: number;
  profileId: string;
  profileChangesBaseRevision: number;
  profileChanges: object[];
  profileCommandRevision: number;
  serverTime: string;
  responseVersion: number;
  notifications?: object[];
  multiUpdate?: object[];
}

export class McpEnvelopeFormatter {
  static createEnvelope(profile: any, changes: object[] = [], profileId: string = "athena"): FormattedProfileEnvelope {
    const revision = typeof profile.rvn === "number" ? profile.rvn : 1;
    const cmdRev = typeof profile.commandRevision === "number" ? profile.commandRevision : revision;

    return {
      profileRevision: revision,
      profileId,
      profileChangesBaseRevision: Math.max(0, revision - 1),
      profileChanges: changes,
      profileCommandRevision: cmdRev,
      serverTime: new Date().toISOString(),
      responseVersion: 1,
    };
  }

  static createPurchaseEnvelope(
    profile: any,
    commonCore: any,
    profileChanges: object[],
    lootResult: object[],
    profileId: string = "common_core"
  ): FormattedProfileEnvelope {
    const envelope = this.createEnvelope(profile, profileChanges, profileId);
    envelope.notifications = [
      {
        type: "CatalogPurchase",
        primary: true,
        lootResult: {
          items: lootResult,
        },
      },
    ];
    if (commonCore) {
      envelope.multiUpdate = [
        {
          profileRevision: commonCore.rvn || 1,
          profileId: "common_core",
          profileChangesBaseRevision: Math.max(0, (commonCore.rvn || 1) - 1),
          profileChanges: [],
          profileCommandRevision: commonCore.commandRevision || 1,
        },
      ];
    }
    return envelope;
  }
}

export default McpEnvelopeFormatter;
