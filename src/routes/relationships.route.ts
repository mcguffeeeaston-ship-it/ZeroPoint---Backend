import type { Hono } from "hono";
import FriendModel from "../models/Friend";
import { isMongoConnected } from "../utilites/mongoConnector";

export default function mountRelationshipsRoutes(app: Hono) {
  app.get("/friends/api/public/friends/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    let friendDoc: any = null;

    if (isMongoConnected()) {
      friendDoc = await FriendModel.findOne({ accountId });
    }

    const list = friendDoc?.friends || [];
    return c.json(
      list.map((f: any) => ({
        accountId: f.accountId,
        status: f.status || "ACCEPTED",
        direction: "OUTBOUND",
        created: f.created || new Date().toISOString(),
        favorite: false,
      }))
    );
  });

  app.get("/friends/api/v1/:accountId/summary", async (c) => {
    const accountId = c.req.param("accountId");
    let friendDoc: any = null;

    if (isMongoConnected()) {
      friendDoc = await FriendModel.findOne({ accountId });
    }

    const list = friendDoc?.friends || [];
    const friends = list.map((f: any) => ({
      accountId: f.accountId,
      groups: [],
      mutual: 0,
      alias: "",
      note: "",
      favorite: false,
      created: f.created || new Date().toISOString(),
    }));

    return c.json({
      friends,
      incoming: [],
      outgoing: [],
      suggested: [],
      blocklist: [],
      settings: {
        acceptInvites: "public",
      },
    });
  });

  app.get("/friends/api/public/blocklist/:accountId", async (c) => {
    return c.json({ blockedUsers: [] });
  });

  app.get("/friends/api/public/list/fortnite/:accountId/recentPlayers", async (c) => {
    return c.json([]);
  });

  app.post("/friends/api/public/friends/:accountId/:friendId", async (c) => {
    const accountId = c.req.param("accountId");
    const friendId = c.req.param("friendId");

    if (isMongoConnected()) {
      await FriendModel.findOneAndUpdate(
        { accountId },
        { $addToSet: { friends: { accountId: friendId, status: "ACCEPTED", created: new Date() } } },
        { upsert: true }
      );
      await FriendModel.findOneAndUpdate(
        { accountId: friendId },
        { $addToSet: { friends: { accountId, status: "ACCEPTED", created: new Date() } } },
        { upsert: true }
      );
    }

    return c.body(null, 204);
  });

  app.delete("/friends/api/public/friends/:accountId/:friendId", async (c) => {
    const accountId = c.req.param("accountId");
    const friendId = c.req.param("friendId");

    if (isMongoConnected()) {
      await FriendModel.findOneAndUpdate(
        { accountId },
        { $pull: { friends: { accountId: friendId } } }
      );
      await FriendModel.findOneAndUpdate(
        { accountId: friendId },
        { $pull: { friends: { accountId } } }
      );
    }

    return c.body(null, 204);
  });
}
