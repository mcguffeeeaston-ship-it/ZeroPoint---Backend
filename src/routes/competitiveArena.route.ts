import type { Hono } from "hono";

export default function mountCompetitiveArenaRoutes(app: Hono) {
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
}
