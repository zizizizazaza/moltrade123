import { Request, Response, NextFunction } from "express";
import { PrivyClient } from "@privy-io/server-auth";

export interface PrivyAuthedRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    appId: string;
    token: string;
  };
}

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  const PRIVY_APP_ID = (process.env.PRIVY_APP_ID || "").trim();
  const PRIVY_APP_SECRET = (process.env.PRIVY_APP_SECRET || "").trim();
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    console.warn(
      `[auth] missing privy env: PRIVY_APP_ID=${Boolean(
        PRIVY_APP_ID
      )} PRIVY_APP_SECRET=${Boolean(PRIVY_APP_SECRET)}`
    );
    throw new Error("PRIVY_APP_ID or PRIVY_APP_SECRET is not set");
  }
  if (!privyClient) {
    privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
  }
  return privyClient;
}

function parseBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const m = headerValue.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export async function requirePrivyAuth(
  req: PrivyAuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = parseBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      console.warn(`[auth] missing bearer token for ${req.method} ${req.originalUrl}`);
      res.status(401).json({ detail: "Missing Authorization Bearer token" });
      return;
    }
    const client = getPrivyClient();
    const PRIVY_VERIFICATION_KEY =
      (process.env.PRIVY_VERIFICATION_KEY || "").trim() || undefined;
    const claims = await client.verifyAuthToken(token, PRIVY_VERIFICATION_KEY);
    req.auth = {
      userId: claims.userId,
      sessionId: claims.sessionId,
      appId: claims.appId,
      token,
    };
    next();
  } catch (err: any) {
    console.warn(
      `[auth] verify failed ${req.method} ${req.originalUrl}: ${String(
        err?.message || err
      )}`
    );
    res.status(401).json({ detail: `Unauthorized: ${String(err?.message || err)}` });
  }
}

