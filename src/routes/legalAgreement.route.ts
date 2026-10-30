import type { Hono } from "hono";

export default function mountLegalAgreementRoutes(app: Hono) {
  app.get("/eula/v1/agreement/fn/account/:accountId", async (c) => {
    return c.body(null, 204);
  });

  app.get("/eula/v1/agreement/fn/sharedAgreements", async (c) => {
    return c.json([]);
  });
}
