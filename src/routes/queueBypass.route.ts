import type { Hono } from "hono";

export default function mountQueueBypassRoutes(app: Hono) {
  app.get("/waitingroom/api/waitingroom", async (c) => {
    return c.body(null, 204);
  });
}
