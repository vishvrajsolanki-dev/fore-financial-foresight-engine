import { SignJWT, jwtVerify } from "jose";

const ACCESS_TTL_SEC = 15 * 60; // 15 minutes — Blueprint 2 §7
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export interface AccessPayload {
  sub: string; // userId only — no email, no financial data in JWT
  sid: string; // active financial session id
}

function accessSecret(): Uint8Array {
  const s = process.env.JWT_ACCESS_SECRET?.trim();
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_ACCESS_SECRET is required in production");
    }
    return new TextEncoder().encode("fore-dev-access-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  return new SignJWT({ sid: payload.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(accessSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret());
    const sub = payload.sub;
    const sid = payload.sid;
    if (typeof sub !== "string" || typeof sid !== "string") return null;
    return { sub, sid };
  } catch {
    return null;
  }
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TTL_SEC * 1000);
}

export function generateRefreshTokenRaw(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export const COOKIE_ACCESS = "fore_access";
export const COOKIE_REFRESH = "fore_refresh";

export function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
