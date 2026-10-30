import jwt from "jsonwebtoken";
import type { Context, Next } from "hono";
import config from "../config";
import EpicServiceError from "./serviceErrors";
import UserModel, { type IUser } from "../models/User";

interface CachedTokenRecord {
  token: string;
  accountId: string;
  type: "access" | "refresh" | "client" | "exchange";
  expiresAt: number;
}

const activeTokenVault: CachedTokenRecord[] = [];
const exchangeCodeRegistry = new Map<string, string>();

export class TokenAuthority {
  static issueAccessToken(user: { accountId: string; username: string }, clientId: string = "ec684b8c687f479fadea3cb245e86d28", grantType: string = "password"): string {
    const durationHours = 24;
    const token = jwt.sign(
      {
        app: "fortnite",
        sub: user.accountId,
        mver: false,
        clid: clientId,
        dn: user.username,
        am: grantType,
        p: Buffer.from(crypto.randomUUID()).toString("base64"),
        iai: user.accountId,
        sec: 1,
        clsvc: "fortnite",
        t: "s",
        ic: true,
        jti: crypto.randomUUID().replace(/-/g, ""),
        creation_date: new Date().toISOString(),
        hours_expire: durationHours,
      },
      config.jwtSecret,
      { expiresIn: `${durationHours}h` }
    );

    const packedToken = `eg1~${token}`;
    activeTokenVault.push({
      token: packedToken,
      accountId: user.accountId,
      type: "access",
      expiresAt: Date.now() + durationHours * 3600 * 1000,
    });

    return packedToken;
  }

  static issueRefreshToken(user: { accountId: string; username: string }, clientId: string = "ec684b8c687f479fadea3cb245e86d28"): string {
    const durationHours = 720;
    const token = jwt.sign(
      {
        sub: user.accountId,
        t: "r",
        clid: clientId,
        jti: crypto.randomUUID().replace(/-/g, ""),
        creation_date: new Date().toISOString(),
        hours_expire: durationHours,
      },
      config.jwtSecret,
      { expiresIn: `${durationHours}h` }
    );

    const packedToken = `eg1~${token}`;
    activeTokenVault.push({
      token: packedToken,
      accountId: user.accountId,
      type: "refresh",
      expiresAt: Date.now() + durationHours * 3600 * 1000,
    });

    return packedToken;
  }

  static issueClientToken(clientId: string = "ec684b8c687f479fadea3cb245e86d28"): string {
    const durationHours = 24;
    const token = jwt.sign(
      {
        p: Buffer.from(crypto.randomUUID()).toString("base64"),
        clsvc: "fortnite",
        t: "s",
        mver: false,
        clid: clientId,
        ic: true,
        am: "client_credentials",
        jti: crypto.randomUUID().replace(/-/g, ""),
        creation_date: new Date().toISOString(),
        hours_expire: durationHours,
      },
      config.jwtSecret,
      { expiresIn: `${durationHours}h` }
    );

    const packedToken = `eg1~${token}`;
    activeTokenVault.push({
      token: packedToken,
      accountId: "client",
      type: "client",
      expiresAt: Date.now() + durationHours * 3600 * 1000,
    });

    return packedToken;
  }

  static generateExchangeCode(accountId: string): string {
    const code = crypto.randomUUID().replace(/-/g, "");
    exchangeCodeRegistry.set(code, accountId);
    setTimeout(() => exchangeCodeRegistry.delete(code), 300000);
    return code;
  }

  static claimExchangeCode(code: string): string | null {
    const targetAccountId = exchangeCodeRegistry.get(code);
    if (targetAccountId) {
      exchangeCodeRegistry.delete(code);
      return targetAccountId;
    }
    return null;
  }

  static purgeAccountTokens(accountId: string) {
    for (let i = activeTokenVault.length - 1; i >= 0; i--) {
      if (activeTokenVault[i].accountId === accountId) {
        activeTokenVault.splice(i, 1);
      }
    }
  }

  static verifyTokenPayload(tokenStr: string): any | null {
    try {
      const sanitized = tokenStr.replace(/^bearer\s+/i, "").replace("eg1~", "");
      return jwt.verify(sanitized, config.jwtSecret);
    } catch {
      return null;
    }
  }

  static decodeTokenPayload(tokenStr: string): any | null {
    try {
      const sanitized = tokenStr.replace(/^bearer\s+/i, "").replace("eg1~", "");
      return jwt.decode(sanitized);
    } catch {
      return null;
    }
  }
}

export async function authenticateSession(c: Context, next: Next) {
  const headerValue = c.req.header("Authorization");
  if (!headerValue) {
    return c.json(EpicServiceError.unauthorized("Missing Authorization header"), 401);
  }

  const payload = TokenAuthority.verifyTokenPayload(headerValue);
  if (!payload) {
    return c.json(EpicServiceError.unauthorized("Invalid or expired token"), 401);
  }

  let accountEntity: IUser | null = null;
  if (payload.sub && payload.sub !== "client") {
    accountEntity = await UserModel.findOne({ accountId: payload.sub });
    if (accountEntity && accountEntity.banned) {
      return c.json(EpicServiceError.banned(accountEntity.banReason || "Your account has been banned"), 403);
    }
  }

  c.set("jwt", payload);
  c.set("user", accountEntity || { accountId: payload.sub || "anonymous", username: payload.dn || "Player" });
  await next();
}

export default TokenAuthority;
