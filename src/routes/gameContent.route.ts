import type { Hono } from "hono";
import path from "node:path";
import parseUserAgent from "../utilites/agentParser";

export default function mountGameContentRoutes(app: Hono) {
  const pagesDiskPath = path.join(process.cwd(), "src", "memory", "content", "pages.json");

  app.get("/content/api/pages/fortnite-game", async (c) => {
    const ua = parseUserAgent(c.req.header("User-Agent"));
    let contentPayload: any = {};

    try {
      const file = Bun.file(pagesDiskPath);
      if (await file.exists()) {
        contentPayload = await file.json();
      }
    } catch {}

    if (!contentPayload.dynamicbackgrounds) {
      contentPayload.dynamicbackgrounds = {
        backgrounds: {
          backgrounds: [],
          _type: "DynamicBackgroundList",
        },
        _title: "dynamicbackgrounds",
        _noIndex: false,
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
      };
    }

    contentPayload.dynamicbackgrounds.backgrounds.backgrounds = [
      { stage: ua.background || "season9", _type: "DynamicBackground", key: "vault" },
      { stage: ua.background || "season9", _type: "DynamicBackground", key: "lobby" },
    ];

    if (ua.season >= 19) {
      contentPayload.dynamicbackgrounds.backgrounds.backgrounds.push({
        stage: "defaultnotris",
        _type: "DynamicBackground",
        key: "lobby",
        backgroundimage: "https://cdn2.unrealengine.com/nocturnal-storebg-cms-1921x1081-796115fa0fc9.png",
      });
    }

    contentPayload.battleroyalenews = {
      news: {
        _type: "Battle Royale News",
        messages: [
          {
            image: "https://cdn2.unrealengine.com/12br-patchnotes-news-motd-1024x512-1024x512-701389279.jpg",
            hidden: false,
            _type: "CommonUI Simple Message Base",
            title: "ZeroPoint by Nyxa",
            body: "Welcome to ZeroPoint by Nyxa! The premier open-source Fortnite experience. Enjoy full Season 9 custom lockers, matchmaking, quests, and party features!",
            spotlight: false,
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/battleroyalenews/v9/900/09BR_PatchNotes_MOTD-1024x512-a72f0b9d99c3dfc29f649bf44beae2014bdfc919.jpg",
            hidden: false,
            _type: "CommonUI Simple Message Base",
            title: "ZeroPoint by Nyxa - Season 9",
            body: "Explore Neo Tilted, Mega Mall, and the Slipstream transport network powered by ZeroPoint by Nyxa.",
            spotlight: true,
          },
        ],
      },
      _title: "battleroyalenews",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.emergencynotice = {
      news: {
        _type: "Emergency Notice",
        messages: [
          {
            hidden: false,
            _type: "CommonUI Simple Message Base",
            title: "ZeroPoint by Nyxa",
            body: "ZeroPoint by Nyxa is operational and running smoothly.",
          },
        ],
      },
      _title: "emergencynotice",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.loginmessage = {
      loginmessage: {
        _type: "CommonUI Simple Message",
        message: {
          _type: "CommonUI Simple Message Base",
          title: "ZeroPoint by Nyxa",
          body: "ZeroPoint by Nyxa - Instant unlocks, all cosmetics, STW, and full matchmaking.",
        },
      },
      _title: "loginmessage",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    return c.json(contentPayload);
  });
}
