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
import { getPersona } from "@/lib/data/personas";
import { inferCityTier, inferIncomeBracket } from "@/lib/csv/parseBankCsv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  monthlyIncome: z.number().positive().optional(),
  cityTier: z.string().optional(),
  demoPersonaId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { email, password, monthlyIncome, cityTier, demoPersonaId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, provider: "email" },
  });

  let sessionId: string;
  if (demoPersonaId) {
    const seed = getPersona(demoPersonaId);
    if (!seed) {
      return NextResponse.json({ error: "Invalid demo persona" }, { status: 400 });
    }
    sessionId = await createSessionFromTransactions({
      userId: user.id,
      transactions: seed.transactions,
      monthlyIncome: seed.monthly_income,
      incomeBracket: seed.income_bracket,
      cityTier: seed.city_tier,
      dataSource: "demo",
      persona: seed.persona,
    });
  } else {
    const income = monthlyIncome ?? 60000;
    sessionId = await createSessionFromTransactions({
      userId: user.id,
      transactions: [
        {
          date: new Date().toISOString().slice(0, 10),
          category: "opening_balance",
          amount: income * 2,
          description: "Opening balance",
        },
      ],
      monthlyIncome: income,
      incomeBracket: inferIncomeBracket(income),
      cityTier: inferCityTier(cityTier ?? "Tier 2"),
      dataSource: "demo",
      persona: "New account",
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
