import type { Hono } from "hono";
import TokenAuthority from "../utilites/tokenAuthority";
import UserModel from "../models/User";
import EpicServiceError from "../utilites/serviceErrors";
import logger from "../utilites/appLogger";
import { isMongoConnected } from "../utilites/mongoConnector";

export default function mountAuthenticationRoutes(app: Hono) {
  app.post("/account/api/oauth/token", async (c) => {
    let payload: any = {};
    const headerType = c.req.header("content-type") || "";

    if (headerType.includes("application/json")) {
      payload = await c.req.json().catch(() => ({}));
    } else {
      payload = await c.req.parseBody().catch(() => ({}));
    }

    const grantType = payload.grant_type;
    const authHeader = c.req.header("Authorization") || "";
    let clientId = "ec684b8c687f479fadea3cb245e86d28";

    if (authHeader.startsWith("Basic ")) {
      try {
        const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString("utf-8");
        clientId = decoded.split(":")[0] || clientId;
      } catch {}
    }

    const hwid = c.req.header("X-Epic-Device-ID") || c.req.header("HWID");

    if (grantType === "client_credentials") {
      const token = TokenAuthority.issueClientToken(clientId);
      return c.json({
        access_token: token,
        expires_in: 86400,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        token_type: "bearer",
        client_id: clientId,
        internal_client: true,
        client_service: "fortnite",
      });
    }

    let user: any = null;

    if (grantType === "password") {
      const usernameInput = (payload.username || "").trim();
      const passwordInput = payload.password || "";

      if (!usernameInput) {
        return c.json(EpicServiceError.badRequest("username is required"), 400);
      }

      const email = usernameInput.includes("@") ? usernameInput : `${usernameInput}@zeropoint.local`;
      const displayName = usernameInput.includes("@") ? usernameInput.split("@")[0] : usernameInput;

      if (isMongoConnected()) {
        user = await UserModel.findOne({
          $or: [{ email: email.toLowerCase() }, { username: displayName }],
        });
      }

      if (hwid && isMongoConnected()) {
        const hwidBanned = await UserModel.findOne({ hwid, banned: true });
        if (hwidBanned) {
          return c.json(EpicServiceError.banned("Your hardware device has been banned by ZeroPoint by Nyxa."), 403);
        }
      }

      if (!user) {
        const accountId = crypto.randomUUID().replace(/-/g, "");
        const hashedPassword = passwordInput ? await Bun.password.hash(passwordInput) : "";

        if (isMongoConnected()) {
          try {
            user = await UserModel.create({
              accountId,
              username: displayName,
              email: email.toLowerCase(),
              password: hashedPassword,
              hwid: hwid || undefined,
              banned: false,
            });
            logger.info(`Registered ZeroPoint player: ${displayName} (${accountId})`);
          } catch (err: any) {
            user = { accountId, username: displayName, email, banned: false };
          }
        } else {
          user = { accountId, username: displayName, email, banned: false };
        }
      } else {
        if (user.banned) {
          return c.json(EpicServiceError.banned(user.banReason || "Account banned on ZeroPoint by Nyxa."), 403);
        }

        if (user.password && passwordInput) {
          const isValid = await Bun.password.verify(passwordInput, user.password).catch(() => true);
          if (!isValid) {
            return c.json(EpicServiceError.badRequest("Invalid password credentials"), 400);
          }
        }

        if (hwid && !user.hwid && isMongoConnected()) {
          user.hwid = hwid;
          await user.save().catch(() => {});
        }
      }
    } else if (grantType === "exchange_code") {
      const code = payload.exchange_code;
      const accountId = TokenAuthority.claimExchangeCode(code);
      if (!accountId) {
        return c.json(EpicServiceError.badRequest("Invalid exchange code"), 400);
      }

      if (isMongoConnected()) {
        user = await UserModel.findOne({ accountId });
      }
      if (!user) {
        user = { accountId, username: "Player", banned: false };
      }
    } else if (grantType === "refresh_token") {
      const refreshToken = payload.refresh_token;
      const decoded = TokenAuthority.verifyTokenPayload(refreshToken);
      if (!decoded || !decoded.sub) {
        return c.json(EpicServiceError.badRequest("Invalid refresh token"), 400);
      }

      if (isMongoConnected()) {
        user = await UserModel.findOne({ accountId: decoded.sub });
      }
      if (!user) {
        user = { accountId: decoded.sub, username: "Player", banned: false };
      }
    } else {
      return c.json(EpicServiceError.badRequest(`Unsupported grant_type '${grantType}'`), 400);
    }

    if (!user) {
      return c.json(EpicServiceError.badRequest("Authentication rejected"), 400);
    }

    TokenAuthority.purgeAccountTokens(user.accountId);
    const accessToken = TokenAuthority.issueAccessToken(user, clientId, grantType);
    const refreshToken = TokenAuthority.issueRefreshToken(user, clientId);

    return c.json({
      access_token: accessToken,
      expires_in: 86400,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      token_type: "bearer",
      account_id: user.accountId,
      client_id: clientId,
      internal_client: true,
      client_service: "fortnite",
      refresh_token: refreshToken,
      refresh_expires: 2592000,
      refresh_expires_at: new Date(Date.now() + 2592000000).toISOString(),
      displayName: user.username,
      app: "fortnite",
      in_app_id: user.accountId,
      device_id: hwid || "device_zeropoint_nyxa",
    });
  });

  app.get("/account/api/oauth/verify", async (c) => {
    const authHeader = c.req.header("Authorization") || "";
    const decoded = TokenAuthority.verifyTokenPayload(authHeader);

    if (!decoded) {
      return c.json(EpicServiceError.unauthorized("Invalid Token"), 401);
    }

    let user: any = null;
    if (isMongoConnected() && decoded.sub) {
      user = await UserModel.findOne({ accountId: decoded.sub });
    }

    const username = user?.username || decoded.dn || "Player";
    const accountId = user?.accountId || decoded.sub;

    return c.json({
      token: authHeader.replace(/^bearer\s+/i, ""),
      session_id: decoded.jti,
      token_type: "bearer",
      client_id: decoded.clid,
      internal_client: true,
      client_service: "fortnite",
      account_id: accountId,
      expires_in: 86400,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      auth_method: decoded.am || "password",
      display_name: username,
      app: "fortnite",
      in_app_id: accountId,
      device_id: decoded.dvid || "device_zeropoint_nyxa",
    });
  });

  app.delete("/account/api/oauth/sessions/kill/:token", async (c) => {
    return c.body(null, 204);
  });

  app.post("/account/api/oauth/createExchangeCode", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const accountId = body.accountId;

    if (!accountId) {
      return c.json(EpicServiceError.badRequest("accountId is required"), 400);
    }

    const code = TokenAuthority.generateExchangeCode(accountId);
    return c.json({ code });
  });
}
