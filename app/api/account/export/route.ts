import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { sessionToContext } from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { decryptField } from "@/lib/security/encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
      emailVerifiedAt: true,
      createdAt: true,
      consent: true,
      preferences: true,
      subscription: true,
      sessions: {
        where: { isActive: true },
        take: 1,
        select: { id: true, persona: true, createdAt: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ctx = await sessionToContext(auth.sid, auth.sub);
  const transactions = await prisma.transaction.findMany({
    where: { sessionId: auth.sid, session: { userId: auth.sub } },
    orderBy: { date: "asc" },
    select: {
      date: true,
      category: true,
      amount: true,
      merchant: true,
      descriptionEnc: true,
      confidence: true,
      source: true,
    },
  });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    consent: user.consent,
    preferences: user.preferences,
    subscription: user.subscription
      ? {
          plan: user.subscription.plan,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
        }
      : null,
    session: ctx,
    transactions: transactions.map((t) => ({
      date: t.date,
      category: t.category,
      amount: t.amount,
      merchant: t.merchant,
      description: t.descriptionEnc ? decryptField(t.descriptionEnc) : undefined,
      confidence: t.confidence,
      source: t.source,
    })),
  });
}
