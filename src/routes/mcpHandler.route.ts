import type { Hono } from "hono";
import registeredOperations from "../operations/operationHandlers";
import ProfileDataManager from "../utilites/profileService";
import McpEnvelopeFormatter from "../utilites/mcpFormatter";
import EpicServiceError from "../utilites/serviceErrors";
import logger from "../utilites/appLogger";

export default function mountMcpRoutes(app: Hono) {
  app.post("/fortnite/api/game/v2/profile/:accountId/client/:action", async (c) => {
    const accountId = c.req.param("accountId");
    const action = c.req.param("action");
    const profileId = c.req.query("profileId") || "athena";

    if (!accountId || !action) {
      return c.json(EpicServiceError.badRequest("Missing parameters"), 400);
    }

    const handler = registeredOperations[action];
    if (handler && typeof handler === "function") {
      return await handler(c);
    }

    logger.warn(`ZeroPoint unhandled client action: ${action} for ${profileId}`);
    const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
    return c.json(McpEnvelopeFormatter.createEnvelope(profile, [], profileId));
  });

  app.post("/fortnite/api/game/v2/profile/:accountId/dedicated_server/:action", async (c) => {
    const accountId = c.req.param("accountId");
    const action = c.req.param("action");
    const profileId = c.req.query("profileId") || "athena";

    if (!accountId || !action) {
      return c.json(EpicServiceError.badRequest("Missing parameters"), 400);
    }

    const handler = registeredOperations[action];
    if (handler && typeof handler === "function") {
      return await handler(c);
    }

    logger.warn(`ZeroPoint unhandled dedicated_server action: ${action} for ${profileId}`);
    const profile = await ProfileDataManager.retrieveProfile(accountId, profileId);
    return c.json(McpEnvelopeFormatter.createEnvelope(profile, [], profileId));
  });

  app.post("/fortnite/api/game/v3/profile/:accountId/client/emptygift", async (c) => {
    const accountId = c.req.param("accountId");
    const commonCore = await ProfileDataManager.retrieveProfile(accountId, "common_core");
    return c.json(McpEnvelopeFormatter.createEnvelope(commonCore, [], "common_core"));
  });
}
