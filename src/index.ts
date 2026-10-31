import { Hono } from "hono";
import path from "node:path";
import config from "./config";
import connectMongo from "./utilites/mongoConnector";
import logger from "./utilites/appLogger";
import EpicServiceError from "./utilites/serviceErrors";
import handleSocketStream from "./ws/xmpp/xmppBroker";

import mountAuthenticationRoutes from "./routes/authentication.route";
import mountAccountRoutes from "./routes/accounts.route";
import mountServiceStatusRoutes from "./routes/serviceStatus.route";
import mountQueueBypassRoutes from "./routes/queueBypass.route";
import mountClientVersionRoutes from "./routes/clientVersion.route";
import mountSystemStorageRoutes from "./routes/systemStorage.route";
import mountUserSettingsRoutes from "./routes/userSettings.route";
import mountCalendarTimelineRoutes from "./routes/calendarTimeline.route";
import mountShopCatalogRoutes from "./routes/shopCatalog.route";
import mountGameContentRoutes from "./routes/gameContent.route";
import mountMcpRoutes from "./routes/mcpHandler.route";
import mountRelationshipsRoutes from "./routes/relationships.route";
import mountPartyManagerRoutes from "./routes/partyManager.route";
import mountMatchServiceRoutes from "./routes/matchService.route";
import mountCompetitiveArenaRoutes from "./routes/competitiveArena.route";
import mountLegalAgreementRoutes from "./routes/legalAgreement.route";
import mountTelemetryRouterRoutes from "./routes/telemetryRouter.route";

const app = new Hono();

app.use("*", async (c, next) => {
  const startTime = Date.now();
  await next();
  const elapsed = Date.now() - startTime;
  logger.info(`${c.req.method} ${c.req.url} - ${c.res.status} [${elapsed}ms]`);
});

app.get("/", (c) => {
  return c.json({
    status: "online",
    name: "ZeroPoint by Nyxa",
    version: "9.41.0",
    season: 9,
    description: "Universal OGFN Backend powered by Bun and Hono",
  });
});

app.get("/static/images/:file", async (c) => {
  const file = c.req.param("file");
  const filePath = path.join(process.cwd(), "src", "static", "images", path.basename(file));
  const fileHandle = Bun.file(filePath);
  if (await fileHandle.exists()) {
    const ext = path.extname(file).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
    return new Response(fileHandle, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
  return c.text("Image not found", 404);
});

mountAuthenticationRoutes(app);
mountAccountRoutes(app);
mountServiceStatusRoutes(app);
mountQueueBypassRoutes(app);
mountClientVersionRoutes(app);
mountSystemStorageRoutes(app);
mountUserSettingsRoutes(app);
mountCalendarTimelineRoutes(app);
mountShopCatalogRoutes(app);
mountGameContentRoutes(app);
mountMcpRoutes(app);
mountRelationshipsRoutes(app);
mountPartyManagerRoutes(app);
mountMatchServiceRoutes(app);
mountCompetitiveArenaRoutes(app);
mountLegalAgreementRoutes(app);
mountTelemetryRouterRoutes(app);

app.notFound((c) => {
  return c.json(EpicServiceError.notFound(`Endpoint ${c.req.url} not found`), 404);
});

app.onError((err, c) => {
  logger.error(`Error on ${c.req.url}: ${err.message}`);
  return c.json(EpicServiceError.create("errors.com.epicgames.common.server_error", err.message, 500), 500);
});

await connectMongo();

const primaryServer = Bun.serve<{ req: Request }>({
  port: config.port,
  fetch(req, server) {
    if (server.upgrade(req, { data: { req } })) {
      return;
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      const socketHandler = handleSocketStream(ws, ws.data?.req);
      (ws as any)._handler = socketHandler;
    },
    message(ws, message) {
      if ((ws as any)._handler) {
        (ws as any)._handler.onMessage(message);
      }
    },
    close(ws) {
      if ((ws as any)._handler) {
        (ws as any)._handler.onClose();
      }
    },
  },
});

logger.info(`ZeroPoint by Nyxa listening on port ${config.port} (HTTP & WS)`);

if (config.wsPort && config.wsPort !== config.port) {
  try {
    Bun.serve<{ req: Request }>({
      port: config.wsPort,
      fetch(req, server) {
        if (server.upgrade(req, { data: { req } })) {
          return;
        }
        return new Response("ZeroPoint by Nyxa WebSocket Server", { status: 200 });
      },
      websocket: {
        open(ws) {
          const socketHandler = handleSocketStream(ws, ws.data?.req);
          (ws as any)._handler = socketHandler;
        },
        message(ws, message) {
          if ((ws as any)._handler) {
            (ws as any)._handler.onMessage(message);
          }
        },
        close(ws) {
          if ((ws as any)._handler) {
            (ws as any)._handler.onClose();
          }
        },
      },
    });
    logger.info(`ZeroPoint by Nyxa Dedicated WebSocket listening on port ${config.wsPort} (Port 80 XMPP/MM)`);
  } catch (err: any) {
    logger.warn(
      `Could not bind dedicated WS port ${config.wsPort} (${err.message}). WebSockets available on port ${config.port}.`
    );
  }
}

export { app };
