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
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/security/encryption";
import { createSessionFromTransactions } from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { PERSONAS } from "@/lib/data/personas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_GUEST_PASSWORD = "fore-demo-guest-not-for-production";

const schema = z.object({
  provider: z.enum(["Google", "Microsoft", "GitHub"]).optional(),
});

function demoEmail(provider?: string): string {
  const slug = (provider ?? "guest").toLowerCase();
  return `demo-${slug}@fore.app`;
}

async function ensureActiveSession(userId: string): Promise<string> {
  const activeSession = await prisma.financialSession.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (activeSession) return activeSession.id;

  const seed = PERSONAS[0];
  return createSessionFromTransactions({
    userId,
    transactions: seed?.transactions ?? [],
    monthlyIncome: seed?.monthly_income ?? 60000,
    incomeBracket: seed?.income_bracket ?? "50k-75k",
    cityTier: seed?.city_tier ?? "Tier 2",
    dataSource: "demo",
    persona: seed?.persona ?? "Demo guest",
  });
}

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const email = demoEmail(parsed.data.provider);
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = await hashPassword(DEMO_GUEST_PASSWORD);
    user = await prisma.user.create({
      data: { email, passwordHash },
    });
    const seed = PERSONAS[0];
    if (seed) {
      await createSessionFromTransactions({
        userId: user.id,
        transactions: seed.transactions,
        monthlyIncome: seed.monthly_income,
        incomeBracket: seed.income_bracket,
        cityTier: seed.city_tier,
        dataSource: "demo",
        persona: seed.persona,
      });
    }
  }

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

  const res = NextResponse.json({
    user: { id: user.id, email: user.email },
    sessionId,
    demo: true,
  });
  res.cookies.set(COOKIE_ACCESS, accessToken, cookieOptions(15 * 60));
  res.cookies.set(COOKIE_REFRESH, refreshRaw, cookieOptions(7 * 24 * 60 * 60));
  return res;
}
