import type { Hono } from "hono";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export default function mountSystemStorageRoutes(app: Hono) {
  const directory = path.join(process.cwd(), "src", "cloudstorage", "system");

  app.get("/fortnite/api/cloudstorage/system", async (c) => {
    try {
      const dirEntries = await readdir(directory);
      const manifest = [];

      for (const entry of dirEntries) {
        if (!entry.toLowerCase().endsWith(".ini")) continue;
        const targetPath = path.join(directory, entry);
        const diskFile = Bun.file(targetPath);
        if (!(await diskFile.exists())) continue;

        const arrayBuf = await diskFile.arrayBuffer();
        const statData = await diskFile.stat();
        const byteView = new Uint8Array(arrayBuf);

        manifest.push({
          uniqueFilename: entry,
          filename: entry,
          hash: createHash("sha1").update(byteView).digest("hex"),
          hash256: createHash("sha256").update(byteView).digest("hex"),
          length: byteView.byteLength,
          contentType: "application/octet-stream",
          uploaded: statData?.mtime || new Date().toISOString(),
          storageType: "S3",
          storageIds: {},
          doNotCache: true,
        });
      }

      return c.json(manifest);
    } catch {
      return c.json([]);
    }
  });

  app.get("/fortnite/api/cloudstorage/system/:file", async (c) => {
    const requestedFile = c.req.param("file") || "";
    if (requestedFile.includes("..") || requestedFile.includes("/") || requestedFile.includes("\\")) {
      return c.body(null, 404);
    }

    const fileDiskPath = path.join(directory, requestedFile);
    const diskFile = Bun.file(fileDiskPath);

    if (await diskFile.exists()) {
      return c.body(await diskFile.arrayBuffer(), 200, {
        "Content-Type": "application/octet-stream",
      });
    }

    return c.body(null, 404);
  });
}
