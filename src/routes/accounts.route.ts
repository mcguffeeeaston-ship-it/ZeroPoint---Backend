import type { Hono } from "hono";
import UserModel from "../models/User";
import { isMongoConnected } from "../utilites/mongoConnector";

function formatAccountData(accountId: string, displayName: string, email: string = "") {
  return {
    id: accountId,
    displayName: displayName,
    name: displayName,
    email: email || `${displayName}@zeropoint.local`,
    failedLoginAttempts: 0,
    lastLogin: new Date().toISOString(),
    numberOfDisplayNameChanges: 0,
    ageGroup: "UNKNOWN",
    headless: false,
    country: "US",
    lastName: "Server",
    preferredLanguage: "en",
    canUpdateDisplayName: false,
    tfaEnabled: true,
    emailVerified: true,
    minorVerified: false,
    minorExpected: false,
    minorStatus: "NOT_MINOR",
    cabinedMode: false,
    hasHashedEmail: false,
  };
}

export default function mountAccountRoutes(app: Hono) {
  app.get("/account/api/public/account/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    let user: any = null;

    if (isMongoConnected()) {
      user = await UserModel.findOne({ accountId });
    }

    const displayName = user?.username || `ZeroPoint_${accountId.slice(0, 6)}`;
    const email = user?.email || `${displayName}@zeropoint.local`;

    return c.json(formatAccountData(accountId, displayName, email));
  });

  app.get("/account/api/public/account/displayName/:displayName", async (c) => {
    const displayName = c.req.param("displayName");
    let user: any = null;

    if (isMongoConnected()) {
      user = await UserModel.findOne({ username: displayName });
    }

    const accountId = user?.accountId || crypto.randomUUID().replace(/-/g, "");
    const email = user?.email || `${displayName}@zeropoint.local`;

    return c.json(formatAccountData(accountId, displayName, email));
  });

  app.get("/account/api/public/account", async (c) => {
    const queries = c.req.queries("accountId") || [];
    const accounts = [];

    for (const id of queries) {
      let user: any = null;
      if (isMongoConnected()) {
        user = await UserModel.findOne({ accountId: id });
      }
      const displayName = user?.username || `ZeroPoint_${id.slice(0, 6)}`;
      accounts.push(formatAccountData(id, displayName, user?.email));
    }

    return c.json(accounts);
  });

  app.get("/account/api/public/account/:accountId/externalAuths", async (c) => {
    return c.json([]);
  });
}
