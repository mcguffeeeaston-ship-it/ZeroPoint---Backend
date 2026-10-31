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
    secondaryProfile: any,
    profileChanges: object[],
    lootResult: object[],
    profileId: string = "common_core",
    secondaryChanges: object[] = []
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
    if (secondaryProfile) {
      const secProfileId = profileId === "common_core" ? "athena" : "common_core";
      envelope.multiUpdate = [
        {
          profileRevision: secondaryProfile.rvn || 1,
          profileId: secProfileId,
          profileChangesBaseRevision: Math.max(0, (secondaryProfile.rvn || 1) - 1),
          profileChanges: secondaryChanges,
          profileCommandRevision: secondaryProfile.commandRevision || 1,
        },
      ];
    }
    return envelope;
  }
}

export default McpEnvelopeFormatter;
