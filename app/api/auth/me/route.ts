import { NextResponse } from "next/server";

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
    select: { id: true, email: true, createdAt: true },
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

  // Skip description decrypt on hydrate — charts/ML don't need narrations.
  const ctx = await sessionToContext(auth.sid, {
    userId: auth.sub,
    decryptDescriptions: false,
  });

  return NextResponse.json({
    authenticated: true,
    database: true,
    user,
    sessionId: auth.sid,
    context: ctx,
  });
}
