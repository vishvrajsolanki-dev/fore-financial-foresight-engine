import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { verifyAccessToken, type AccessPayload, COOKIE_ACCESS } from "@/lib/auth/jwt";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export async function getAuthFromCookies(): Promise<AccessPayload | null> {
  if (!isDatabaseConfigured()) return null;
  const token = cookies().get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function getAuthFromRequest(req: NextRequest): Promise<AccessPayload | null> {
  if (!isDatabaseConfigured()) return null;
  const token = req.cookies.get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireAuth(req: NextRequest): Promise<AccessPayload | { error: string; status: number }> {
  if (!isDatabaseConfigured()) {
    return { error: "Database not configured — auth unavailable", status: 503 };
  }
  const auth = await getAuthFromRequest(req);
  if (!auth) return { error: "Unauthorized", status: 401 };
  const session = await prisma.financialSession.findFirst({
    where: { id: auth.sid, userId: auth.sub, isActive: true },
  });
  if (!session) return { error: "Session expired or invalid", status: 401 };
  return auth;
}

export function isAuthPayload(
  v: AccessPayload | { error: string; status: number }
): v is AccessPayload {
  return "sub" in v && "sid" in v;
}
