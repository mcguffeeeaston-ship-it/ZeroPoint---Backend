import type { Hono } from "hono";

interface PartyParticipant {
  account_id: string;
  meta: Record<string, any>;
  connections: Array<{
    id: string;
    connected_at: string;
    updated_at: string;
    yield_leadership: boolean;
    meta: Record<string, any>;
  }>;
  revision: number;
  role: string;
  joined_at: string;
  updated_at: string;
}

interface LobbyParty {
  id: string;
  created_at: string;
  updated_at: string;
  config: Record<string, any>;
  members: PartyParticipant[];
  applicants: any[];
  meta: Record<string, any>;
  invites: any[];
  revision: number;
}

const activeLobbySessions = new Map<string, LobbyParty>();

function createUniqueId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function currentTimestamp() {
  return new Date().toISOString();
}

export default function mountPartyManagerRoutes(app: Hono) {
  app.get("/fortnite/api/game/v2/party/user/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const found = Array.from(activeLobbySessions.values()).find((p) =>
      p.members.some((m) => m.account_id === accountId)
    );
    return c.json(found || {});
  });

  app.post("/fortnite/api/game/v2/party/user/:accountId/parties", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const accountId = c.req.param("accountId");
    const id = createUniqueId();
    const t = currentTimestamp();

    const joinInfo = body.join_info || {};
    const connection = joinInfo.connection || {};
    const connId = connection.id || `${accountId}@prod.ol.epicgames.com`;

    const party: LobbyParty = {
      id,
      created_at: t,
      updated_at: t,
      config: {
        type: "DEFAULT",
        discoverability: "ALL",
        sub_type: "default",
        invite_ttl: 14400,
        intention_ttl: 60,
        ...(body.config || {}),
      },
      members: [
        {
          account_id: accountId,
          meta: joinInfo.meta || {},
          connections: [
            {
              id: connId,
              connected_at: t,
              updated_at: t,
              yield_leadership: false,
              meta: connection.meta || {},
            },
          ],
          revision: 0,
          role: "CAPTAIN",
          joined_at: t,
          updated_at: t,
        },
      ],
      applicants: [],
      meta: joinInfo.meta || {},
      invites: [],
      revision: 0,
    };

    activeLobbySessions.set(id, party);
    return c.json(party);
  });

  app.get("/party/api/v1/Fortnite/user/:accountId/notifications/undelivered_count", async (c) => {
    return c.json(0);
  });

  app.get("/party/api/v1/Fortnite/user/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const mine = Array.from(activeLobbySessions.values()).filter((p) =>
      p.members.some((m) => m.account_id === accountId)
    );

    return c.json({
      current: mine,
      pending: [],
      invites: [],
      pings: [],
    });
  });

  app.post("/party/api/v1/Fortnite/parties", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const id = createUniqueId();
    const t = currentTimestamp();

    const joinInfo = body.join_info || {};
    const connection = joinInfo.connection || {};
    const connId = connection.id || "";
    const memberId = connId.split("@")[0] || createUniqueId();

    const party: LobbyParty = {
      id,
      created_at: t,
      updated_at: t,
      config: {
        type: "DEFAULT",
        discoverability: "ALL",
        sub_type: "default",
        invite_ttl: 14400,
        intention_ttl: 60,
        ...(body.config || {}),
      },
      members: [
        {
          account_id: memberId,
          meta: joinInfo.meta || {},
          connections: [
            {
              id: connId,
              connected_at: t,
              updated_at: t,
              yield_leadership: connection.yield_leadership || false,
              meta: connection.meta || {},
            },
          ],
          revision: 0,
          role: "CAPTAIN",
          joined_at: t,
          updated_at: t,
        },
      ],
      applicants: [],
      meta: joinInfo.meta || {},
      invites: [],
      revision: 0,
    };

    activeLobbySessions.set(id, party);
    return c.json(party);
  });

  app.get("/party/api/v1/Fortnite/parties/:partyId", async (c) => {
    const partyId = c.req.param("partyId");
    const party = activeLobbySessions.get(partyId);
    if (!party) return c.body(null, 404);
    return c.json(party);
  });

  app.patch("/party/api/v1/Fortnite/parties/:partyId", async (c) => {
    const partyId = c.req.param("partyId");
    const party = activeLobbySessions.get(partyId);
    if (!party) return c.body(null, 404);

    const body = await c.req.json().catch(() => ({}));
    if (body.meta) {
      if (body.meta.delete && Array.isArray(body.meta.delete)) {
        for (const k of body.meta.delete) delete party.meta[k];
      }
      if (body.meta.update) {
        Object.assign(party.meta, body.meta.update);
      }
    }

    party.revision = (party.revision || 0) + 1;
    party.updated_at = currentTimestamp();
    return c.json(party);
  });

  app.delete("/party/api/v1/Fortnite/parties/:partyId/members/:accountId", async (c) => {
    const partyId = c.req.param("partyId");
    const accountId = c.req.param("accountId");
    const party = activeLobbySessions.get(partyId);

    if (party) {
      party.members = party.members.filter((m) => m.account_id !== accountId);
      if (party.members.length === 0) {
        activeLobbySessions.delete(partyId);
      }
    }

    return c.body(null, 204);
  });
}
