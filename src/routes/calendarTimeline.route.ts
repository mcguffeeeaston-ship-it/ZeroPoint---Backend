import type { Hono } from "hono";
import parseUserAgent from "../utilites/agentParser";

export default function mountCalendarTimelineRoutes(app: Hono) {
  app.get("/fortnite/api/calendar/v1/timeline", async (c) => {
    const ua = parseUserAgent(c.req.header("User-Agent"));
    const season = ua.season || 9;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isoDate = today.toISOString();

    const activeEvents = [
      {
        eventType: `EventFlag.Season${season}`,
        activeSince: "2019-01-01T00:00:00.000Z",
        activeUntil: "9999-01-01T00:00:00.000Z",
      },
      {
        eventType: `EventFlag.${season}`,
        activeSince: "2019-01-01T00:00:00.000Z",
        activeUntil: "9999-01-01T00:00:00.000Z",
      },
      {
        eventType: `EventFlag.LTE_ZeroPoint`,
        activeSince: "2019-01-01T00:00:00.000Z",
        activeUntil: "9999-01-01T00:00:00.000Z",
      },
    ];

    return c.json({
      channels: {
        "client-matchmaking": {
          states: [],
          cacheExpire: "9999-01-01T00:00:00.000Z",
        },
        "client-events": {
          states: [
            {
              validFrom: "2019-01-01T00:00:00.000Z",
              activeEvents,
              state: {
                activeStorefronts: [],
                eventNamedWeights: {},
                seasonNumber: season,
                seasonTemplateId: `AthenaSeason:athenaseason${season}`,
                matchXpBonusPoints: 0,
                seasonBegin: "2019-01-01T00:00:00Z",
                seasonEnd: "9999-01-01T00:00:00Z",
                seasonDisplayedEnd: "9999-01-01T00:00:00Z",
                weeklyStoreEnd: isoDate,
                stwEventStoreEnd: "9999-01-01T00:00:00.000Z",
                stwWeeklyStoreEnd: "9999-01-01T00:00:00.000Z",
                sectionStoreEnds: {
                  Featured: isoDate,
                  Daily: isoDate,
                },
                dailyStoreEnd: isoDate,
              },
            },
          ],
          cacheExpire: isoDate,
        },
      },
      eventsTimeOffsetHrs: 0,
      cacheIntervalMins: 15,
      currentTime: new Date().toISOString(),
    });
  });
}
