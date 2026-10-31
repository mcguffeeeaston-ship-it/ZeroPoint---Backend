import type { Hono } from "hono";
import path from "node:path";
import parseUserAgent from "../utilites/agentParser";
import ShopEngine from "../utilites/shopEngine";

export default function mountShopCatalogRoutes(app: Hono) {
  app.get("/fortnite/api/storefront/v2/catalog", async (c) => {
    const ua = parseUserAgent(c.req.header("User-Agent"));
    const season = ua.season || 9;

    const dynamicStorefronts = await ShopEngine.loadCatalogStorefronts();
    const storefronts: any[] = [...dynamicStorefronts];

    const seasonFile = path.join(process.cwd(), "src", "memory", "storefront", `BRSeason${season}.json`);
    const file = Bun.file(seasonFile);

    if (await file.exists()) {
      try {
        const data = await file.json();
        storefronts.push(data);
      } catch {}
    } else {
      const fallbackFile = Bun.file(path.join(process.cwd(), "src", "memory", "storefront", "BRSeason9.json"));
      if (await fallbackFile.exists()) {
        try {
          const data = await fallbackFile.json();
          storefronts.push(data);
        } catch {}
      }
    }

    const currencyFile = Bun.file(path.join(process.cwd(), "src", "memory", "storefront", "both", "CurrencyStorefront.json"));
    if (await currencyFile.exists()) {
      try {
        const data = await currencyFile.json();
        if (Array.isArray(data)) {
          storefronts.push({
            name: "CurrencyStorefront",
            catalogEntries: data,
          });
        } else {
          storefronts.push(data);
        }
      } catch {}
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return c.json({
      refreshIntervalHrs: 24,
      dailyPurchaseHrs: 24,
      expiration: today.toISOString(),
      storefronts,
    });
  });

  app.get("/fortnite/api/storefront/v2/keychain", async (c) => {
    return c.json([
      "942A684C0CD2CFF8243FE221590F8F12:Xn3p95Z6XbW20N27U6e8/8X6w3Vz43Q8kG00t8l42Z4=",
      "1BC63CE479FECE06BA5C442DCD36B690:gqO0uXhGz1WjYF0vj8iM7X/Tf9hV8e0P9E7g7G2+bC4=",
    ]);
  });
}
