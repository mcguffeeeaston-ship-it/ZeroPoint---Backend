import type { Hono } from "hono";

export default function mountClientVersionRoutes(app: Hono) {
  app.get("/fortnite/api/version", async (c) => {
    return c.json({
      app: "fortnite",
      serverDate: new Date().toISOString(),
      overridePropertiesVersion: "unknown",
      cln: "7407007",
      build: "9",
      moduleName: "Fortnite-Live",
      buildDate: "2019-07-23T14:00:00.000Z",
      version: "9.41.0",
      branch: "++Fortnite+Release-9.41",
      modules: {
        "Epic-ResourceService-Windows": {
          cln: "7407007",
          build: "9",
          buildDate: "2019-07-23T14:00:00.000Z",
          version: "9.41.0",
          branch: "++Fortnite+Release-9.41",
        },
      },
    });
  });

  app.get("/fortnite/api/v2/versioncheck/:version", async (c) => {
    return c.json({ type: "NO_UPDATE" });
  });

  app.get("/fortnite/api/versioncheck/:version", async (c) => {
    return c.json({ type: "NO_UPDATE" });
  });

  app.get("/fortnite/api/game/v2/enabled_features", async (c) => {
    return c.json([]);
  });
}
