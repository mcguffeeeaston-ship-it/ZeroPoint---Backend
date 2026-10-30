import type { Hono } from "hono";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { authenticateSession } from "../utilites/tokenAuthority";

export default function mountUserSettingsRoutes(app: Hono) {
  const settingsStorageDir = path.join(process.cwd(), "src", "cloudstorage", "user");
  mkdir(settingsStorageDir, { recursive: true }).catch(() => {});

  app.get("/fortnite/api/cloudstorage/user/:accountId", authenticateSession, async (c) => {
    const accountId = c.req.param("accountId");
    const targetFile = path.join(settingsStorageDir, `ClientSettings-${accountId}.Sav`);
    const file = Bun.file(targetFile);

    if (!(await file.exists())) {
      return c.json([]);
    }

    const buffer = await file.arrayBuffer();
    const stats = await file.stat();
    const byteView = new Uint8Array(buffer);

    return c.json([
      {
        uniqueFilename: "ClientSettings.Sav",
        filename: "ClientSettings.Sav",
        hash: createHash("sha1").update(byteView).digest("hex"),
        hash256: createHash("sha256").update(byteView).digest("hex"),
        length: byteView.byteLength,
        contentType: "application/octet-stream",
        uploaded: stats?.mtime || new Date().toISOString(),
        storageType: "S3",
        storageIds: {},
        accountId,
        doNotCache: false,
      },
    ]);
  });

  app.get("/fortnite/api/cloudstorage/user/:accountId/:file", authenticateSession, async (c) => {
    const accountId = c.req.param("accountId");
    const rawFile = (c.req.param("file") || "").toLowerCase();

    if (rawFile !== "clientsettings.sav") {
      return c.body(null, 200);
    }

    const targetFile = path.join(settingsStorageDir, `ClientSettings-${accountId}.Sav`);
    const file = Bun.file(targetFile);

    if (await file.exists()) {
      return c.body(await file.arrayBuffer(), 200, {
        "Content-Type": "application/octet-stream",
      });
    }

    return c.body(null, 200);
  });

  app.put("/fortnite/api/cloudstorage/user/:accountId/:file", authenticateSession, async (c) => {
    const accountId = c.req.param("accountId");
    const rawFile = (c.req.param("file") || "").toLowerCase();

    if (rawFile !== "clientsettings.sav") {
      return c.json({ error: "Unsupported file" }, 403);
    }

    const rawData = await c.req.arrayBuffer();
    if (rawData.byteLength >= 500_000) {
      return c.json({ error: "File exceeds 500kb limit" }, 403);
    }

    const targetFile = path.join(settingsStorageDir, `ClientSettings-${accountId}.Sav`);
    await Bun.write(targetFile, rawData);

    return c.body(null, 204);
  });
}
