import type { Hono } from "hono";
import config from "../config";

export default function mountMatchServiceRoutes(app: Hono) {
  app.get("/fortnite/api/matchmaking/session/findPlayer/*", async (c) => {
    return c.body(null, 200);
  });

  app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", async (c) => {
    const wsUrl = `ws://127.0.0.1:${config.wsPort === 80 ? 80 : config.port}`;
    return c.json({
      serviceUrl: wsUrl,
      ticketType: "mms-player",
      payload: "zeropoint_nyxa_ticket_payload",
      signature: "zeropoint_nyxa_ticket_sig",
    });
  });

  app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", async (c) => {
    const accountId = c.req.param("accountId");
    const sessionId = c.req.param("sessionId");

    return c.json({
      accountId,
      sessionId,
      key: "AOJEv8uTFmUh7XM2328kq9rlAzeQ5xzWzPIiyKn2s7s=",
    });
  });

  app.get("/fortnite/api/matchmaking/session/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const sessionToken = crypto.randomUUID().replace(/-/g, "").toUpperCase();

    return c.json({
      id: sessionId,
      ownerId: sessionToken,
      ownerName: "[DS] ZeroPoint by Nyxa",
      serverName: "[DS] ZeroPoint by Nyxa",
      serverAddress: config.gameServer.ip,
      serverPort: config.gameServer.port,
      maxPublicPlayers: 100,
      openPublicPlayers: 99,
      maxPrivatePlayers: 0,
      openPrivatePlayers: 0,
      attributes: {
        REGION_s: "EU",
        GAMEMODE_s: "FORTATHENA",
        ALLOWBROADCASTING_b: true,
        SUBREGION_s: "GB",
        DCID_s: "ZEROPOINT-BY-NYXA",
        tenant_s: "Fortnite",
        MATCHMAKINGPOOL_s: "Any",
        STORMSHIELDDEFENSETYPE_i: 0,
        HOTFIXVERSION_i: 0,
        PLAYLISTNAME_s: "Playlist_DefaultSolo",
        SESSIONKEY_s: sessionToken,
        TENANT_s: "Fortnite",
        BEACONPORT_i: 15009,
      },
      publicPlayers: [],
      privatePlayers: [],
      totalPlayers: 1,
      allowJoinInProgress: false,
      shouldAdvertise: false,
      isDedicated: false,
      usesStats: false,
      allowInvites: false,
      usesPresence: false,
      allowJoinViaPresence: true,
      allowJoinViaPresenceFriendsOnly: false,
      buildUniqueId: "0",
      lastUpdated: new Date().toISOString(),
      started: false,
    });
  });

  app.post("/fortnite/api/matchmaking/session/:sessionId/join", async (c) => {
    return c.body(null, 204);
  });
}
