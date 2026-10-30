import type { Hono } from "hono";

export default function mountTelemetryRouterRoutes(app: Hono) {
  app.post("/datarouter/api/v1/public/data", async (c) => {
    return c.body(null, 204);
  });
}
