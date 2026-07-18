import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  cookieOptions,
  generateRefreshTokenRaw,
  refreshTokenExpiry,
  signAccessToken,
} from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/security/encryption";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const activeSession = await prisma.financialSession.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  let sessionId = activeSession?.id;
  if (!sessionId) {
    sessionId = await (
      await import("@/lib/db/contextService")
    ).createSessionFromTransactions({
      userId: user.id,
      transactions: [],
      monthlyIncome: 60000,
      incomeBracket: "50k-75k",
      cityTier: "Tier 2",
      dataSource: "demo",
      persona: "Upload CSV to begin",
    });
  }

  const refreshRaw = generateRefreshTokenRaw();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshRaw),
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  const accessToken = await signAccessToken({ sub: user.id, sid: sessionId });

  const res = NextResponse.json({
    user: { id: user.id, email: user.email },
    sessionId,
  });
  res.cookies.set(COOKIE_ACCESS, accessToken, cookieOptions(15 * 60));
  res.cookies.set(COOKIE_REFRESH, refreshRaw, cookieOptions(7 * 24 * 60 * 60));
  return res;
}
