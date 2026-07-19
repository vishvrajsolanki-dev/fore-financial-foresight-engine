import { NextRequest, NextResponse } from "next/server";

import { ensureAccountExtras } from "@/lib/account/ensureAccountExtras";
import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { sessionToContext } from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { buildWeeklyBrief } from "@/lib/insights/weeklyBrief";

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

  await ensureAccountExtras(auth.sub);
  const prefs = await prisma.userPreferences.findUnique({ where: { userId: auth.sub } });
  if (prefs && !prefs.weeklyBrief) {
    return NextResponse.json(
      { error: "Weekly brief disabled in notification preferences", disabled: true },
      { status: 403 }
    );
  }

  const ctx = await sessionToContext(auth.sid, {
    userId: auth.sub,
    decryptDescriptions: false,
  });
  if (!ctx) {
    return NextResponse.json({ error: "No active financial session" }, { status: 404 });
  }

  const brief = buildWeeklyBrief(ctx);
  return NextResponse.json({ brief });
}
