import { NextRequest, NextResponse } from "next/server";

import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  cookieOptions,
  generateRefreshTokenRaw,
  refreshTokenExpiry,
  signAccessToken,
} from "@/lib/auth/jwt";
import { hashToken } from "@/lib/security/encryption";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const refreshRaw = req.cookies.get(COOKIE_REFRESH)?.value;
  if (!refreshRaw) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const tokenHash = hashToken(refreshRaw);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return NextResponse.json({ error: "Refresh token invalid or expired" }, { status: 401 });
  }

  const activeSession = await prisma.financialSession.findFirst({
    where: { userId: stored.userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!activeSession) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const newRefreshRaw = generateRefreshTokenRaw();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newRefreshRaw),
      userId: stored.userId,
      expiresAt: refreshTokenExpiry(),
    },
  });

  const accessToken = await signAccessToken({ sub: stored.userId, sid: activeSession.id });

  const res = NextResponse.json({ ok: true, sessionId: activeSession.id });
  res.cookies.set(COOKIE_ACCESS, accessToken, cookieOptions(15 * 60));
  res.cookies.set(COOKIE_REFRESH, newRefreshRaw, cookieOptions(7 * 24 * 60 * 60));
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const refreshRaw = req.cookies.get(COOKIE_REFRESH)?.value;
  if (refreshRaw) {
    const tokenHash = hashToken(refreshRaw);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ACCESS, "", { ...cookieOptions(0), maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, "", { ...cookieOptions(0), maxAge: 0 });
  return res;
}
