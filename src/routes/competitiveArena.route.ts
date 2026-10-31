import type { Hono, Context } from "hono";
import path from "node:path";
import parseUserAgent from "../utilites/agentParser";
import ProfileDataManager from "../utilites/profileService";

function calculateDivision(hype: number): number {
  if (hype >= 3000) return 10;
  if (hype >= 2000) return 9;
  if (hype >= 1500) return 8;
  if (hype >= 1000) return 7;
  if (hype >= 500) return 6;
  if (hype >= 300) return 5;
  if (hype >= 150) return 4;
  if (hype >= 75) return 3;
  if (hype >= 25) return 2;
  return 1;
}

async function loadDynamicEventsAndTemplates(season: number) {
  const eventsPath = path.join(process.cwd(), "src", "memory", "events", "events.json");
  const templatesPath = path.join(process.cwd(), "src", "memory", "events", "templates", "ArenaTemplate.json");

  let events: any[] = [];
  let templates: any[] = [];

  try {
    const rawEvents = await Bun.file(eventsPath).text();
    const replacedEvents = rawEvents
      .replaceAll("_S13_", `_S${season}_`)
      .replaceAll("S13", `S${season}`)
      .replaceAll("lynt_", "zeropoint_");
    events = JSON.parse(replacedEvents);
  } catch {}

  try {
    const rawTemplates = await Bun.file(templatesPath).text();
    const replacedTemplates = rawTemplates
      .replaceAll("_S13_", `_S${season}_`)
      .replaceAll("S13", `S${season}`);
    templates = JSON.parse(replacedTemplates);
  } catch {}

  const triosTemplates: any[] = [];
  const squadsTemplates: any[] = [];
  for (const t of templates) {
    if (t.eventTemplateId && t.eventTemplateId.includes("_Duos")) {
      const triosCopy = JSON.parse(JSON.stringify(t));
      triosCopy.eventTemplateId = triosCopy.eventTemplateId.replace("_Duos", "_Trios");
      triosCopy.playlistId = "Playlist_ShowdownAlt_Trios";
      triosTemplates.push(triosCopy);

      const squadsCopy = JSON.parse(JSON.stringify(t));
      squadsCopy.eventTemplateId = squadsCopy.eventTemplateId.replace("_Duos", "_Squad");
      squadsCopy.playlistId = "Playlist_ShowdownAlt_Squad";
      squadsTemplates.push(squadsCopy);
    }
  }

  templates.push(...triosTemplates, ...squadsTemplates);

  return { events, templates };
}

async function handleEventsDownload(c: Context) {
  const accountId = c.req.param("accountId");
  const appId = c.req.param("appId") || "Fortnite";
  const ua = parseUserAgent(c.req.header("User-Agent"));
  const season = ua.season || 9;

  let playerHype = 1500;
  if (accountId) {
    const athena = await ProfileDataManager.retrieveProfile(accountId, "athena");
    if (athena?.stats?.attributes && typeof athena.stats.attributes.arena_hype === "number") {
      playerHype = athena.stats.attributes.arena_hype;
    }
  }

  const { events, templates } = await loadDynamicEventsAndTemplates(season);
  const division = calculateDivision(playerHype);

  const tokens = [
    `ARENA_S${season}_Division${division}`,
    `ARENA_S${season}_Eligible`,
    "ZeroPoint_Arena_Eligible",
    `ZeroPoint_CashCup_S${season}`,
    `ZeroPoint_FridayNite_S${season}`,
  ];

  return c.json({
    events,
    templates,
    player: {
      gameId: appId,
      accountId: accountId || "unknown",
      tokens,
      teams: {},
      pendingPayouts: [],
      pendingPenalties: [],
      persistentScores: {
        Hype: playerHype,
      },
      groupIdentity: {},
    },
    scores: [],
  });
}

export default function mountCompetitiveArenaRoutes(app: Hono) {
  app.get("/api/v1/events/:appId/download/:accountId", handleEventsDownload);
  app.get("/api/v1/events/download/:accountId", handleEventsDownload);
  app.get("/api/v1/events/:appId/data/:accountId", handleEventsDownload);
  app.get("/api/v1/events/data/:accountId", handleEventsDownload);

  app.get("/fortnite/api/game/v2/events/tournamenthistory/:accountId", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/game/v2/events/history/:accountId", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/game/v2/events/summary/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const ua = parseUserAgent(c.req.header("User-Agent"));
    const season = ua.season || 9;

    let playerHype = 1500;
    if (accountId) {
      const athena = await ProfileDataManager.retrieveProfile(accountId, "athena");
      if (athena?.stats?.attributes && typeof athena.stats.attributes.arena_hype === "number") {
        playerHype = athena.stats.attributes.arena_hype;
      }
    }

    const division = calculateDivision(playerHype);
    return c.json({
      events: [],
      player: {
        gameId: "Fortnite",
        accountId: accountId || "unknown",
        tokens: [`ARENA_S${season}_Division${division}`, `ARENA_S${season}_Eligible`],
        teams: {},
        pendingPayouts: [],
        pendingPenalties: [],
        persistentScores: {
          Hype: playerHype,
        },
        groupIdentity: {},
      },
    });
  });

  app.get("/api/v1/leaderboards/:appId/:eventId/:windowId/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const eventId = c.req.param("eventId");
    const windowId = c.req.param("windowId");

    let playerHype = 1500;
    if (accountId) {
      const athena = await ProfileDataManager.retrieveProfile(accountId, "athena");
      if (athena?.stats?.attributes && typeof athena.stats.attributes.arena_hype === "number") {
        playerHype = athena.stats.attributes.arena_hype;
      }
    }

    return c.json({
      gameId: "Fortnite",
      eventId,
      eventWindowId: windowId,
      page: 0,
      totalPages: 1,
      updatedTime: new Date().toISOString(),
      entries: [
        {
          teamId: accountId,
          teamAccountIds: [accountId],
          liveSessionId: null,
          pointsEarned: playerHype,
          score: playerHype,
          rank: 1,
          percentile: 100,
          pointBreakdown: {
            "PLACEMENT_STAT_INDEX:60": { timesAchieved: 1, pointsEarned: 60 },
            "TEAM_ELIMS_STAT_INDEX:20": { timesAchieved: 5, pointsEarned: 100 },
          },
          sessionHistory: [],
        },
      ],
    });
  });

  app.get("/api/v1/leaderboards/:eventId/:windowId/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const eventId = c.req.param("eventId");
    const windowId = c.req.param("windowId");

    return c.json({
      gameId: "Fortnite",
      eventId,
      eventWindowId: windowId,
      page: 0,
      totalPages: 1,
      updatedTime: new Date().toISOString(),
      entries: [],
    });
  });

  app.get("/fortnite/api/arena/v1/holds/:playlist", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/arena/v1/allentries/:playlist", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/arena/v1/leaderboard/:playlist/:season", async (c) => {
    return c.json({
      entries: [],
      page: 1,
      limit: 50,
    });
  });

  app.post("/fortnite/api/arena/v1/leaderboard/:playlist/:season", async (c) => {
    return c.json({
      entries: [],
      page: 1,
      limit: 50,
    });
  });

  app.get("/fortnite/api/arena/v1/leaderboard/:playlist/:season/entries", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/game/v2/leaderboards/cohort/:accountId", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/statsv2/leaderboards/:leaderboardName", async (c) => {
    return c.json({
      entries: [],
      maxSize: 1000,
    });
  });
}
