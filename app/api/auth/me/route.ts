import { NextResponse } from "next/server";

import { ensureAccountExtras } from "@/lib/account/ensureAccountExtras";
import { getAuthFromCookies } from "@/lib/auth/session";
import { sessionToContext } from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ authenticated: false, database: false });
  }

  const auth = await getAuthFromCookies();
  if (!auth) {
    return NextResponse.json({ authenticated: false, database: true });
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
    },
  });
  if (!user) {
    return NextResponse.json({ authenticated: false, database: true });
  }

  // Re-bind sid to this user (defense-in-depth vs stale/foreign session ids in JWT).
  const owned = await prisma.financialSession.findFirst({
    where: { id: auth.sid, userId: auth.sub, isActive: true },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ authenticated: false, database: true });
  }

  try {
    await ensureAccountExtras(auth.sub);
  } catch (e) {
    console.error("[me] ensureAccountExtras failed", e);
  }
  let preferences = null;
  let subscription = null;
  try {
    [preferences, subscription] = await Promise.all([
      prisma.userPreferences.findUnique({ where: { userId: auth.sub } }),
      prisma.subscription.findUnique({ where: { userId: auth.sub } }),
    ]);
  } catch (e) {
    console.error("[me] preferences/subscription unavailable", e);
  }

  // Skip description decrypt on hydrate — charts/ML don't need narrations.
  const ctx = await sessionToContext(auth.sid, {
    userId: auth.sub,
    decryptDescriptions: false,
  });

  return NextResponse.json({
    authenticated: true,
    database: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt,
    },
    preferences: preferences
      ? {
          appearance: preferences.appearance,
          notifications: {
            emailProduct: preferences.emailProduct,
            emailSecurity: preferences.emailSecurity,
            emailMarketing: preferences.emailMarketing,
            inAppAlerts: preferences.inAppAlerts,
            weeklyBrief: preferences.weeklyBrief,
          },
        }
      : null,
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
    sessionId: auth.sid,
    context: ctx,
  });
}
