import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  cookieOptions,
  generateRefreshTokenRaw,
  refreshTokenExpiry,
  signAccessToken,
} from "@/lib/auth/jwt";
import { ensureAccountExtras } from "@/lib/account/ensureAccountExtras";
import { hashToken } from "@/lib/security/encryption";
import { createSessionFromTransactions } from "@/lib/db/contextService";
import { prisma } from "@/lib/db/prisma";
import { PERSONAS } from "@/lib/data/personas";
import type { OAuthIdentity } from "@/lib/auth/oauth";
import { NextResponse } from "next/server";

async function ensureActiveSession(userId: string): Promise<string> {
  const active = await prisma.financialSession.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (active) return active.id;

  const seed = PERSONAS[0];
  return createSessionFromTransactions({
    userId,
    transactions: seed?.transactions ?? [],
    monthlyIncome: seed?.monthly_income ?? 60000,
    incomeBracket: seed?.income_bracket ?? "50k-75k",
    cityTier: seed?.city_tier ?? "Tier 2",
    dataSource: "demo",
    persona: seed?.persona ?? "Getting started",
  });
}

/** Upsert OAuth user, issue FORE cookies, redirect to next path. */
export async function completeOAuthLogin(identity: OAuthIdentity, nextPath: string) {
  if (!identity.emailVerified) {
    return NextResponse.redirect(
      new URL(`/login?error=email_unverified`, process.env.AUTH_REDIRECT_BASE || "http://localhost:3000")
    );
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { provider: identity.provider, providerAccountId: identity.providerAccountId },
        { email: identity.email },
      ],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: identity.email,
        passwordHash: null,
        provider: identity.provider,
        providerAccountId: identity.providerAccountId,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
        name: identity.name ?? null,
      },
    });
  } else if (!user.providerAccountId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        provider: identity.provider,
        providerAccountId: identity.providerAccountId,
        emailVerifiedAt: user.emailVerifiedAt ?? (identity.emailVerified ? new Date() : null),
        name: user.name ?? identity.name ?? null,
      },
    });
  }

  await ensureAccountExtras(user.id);
  const sessionId = await ensureActiveSession(user.id);
  const refreshRaw = generateRefreshTokenRaw();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshRaw),
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  const accessToken = await signAccessToken({ sub: user.id, sid: sessionId });
  const dest = nextPath.startsWith("/") ? nextPath : "/past";
  const base = process.env.AUTH_REDIRECT_BASE?.trim() || "http://localhost:3000";
  const res = NextResponse.redirect(new URL(dest, base));
  res.cookies.set(COOKIE_ACCESS, accessToken, cookieOptions(15 * 60));
  res.cookies.set(COOKIE_REFRESH, refreshRaw, cookieOptions(7 * 24 * 60 * 60));
  return res;
}
