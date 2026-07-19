import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureAccountExtras } from "@/lib/account/ensureAccountExtras";
import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  appearance: z.enum(["light", "evening"]).optional(),
  emailProduct: z.boolean().optional(),
  emailSecurity: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  inAppAlerts: z.boolean().optional(),
  weeklyBrief: z.boolean().optional(),
});

function serialize(prefs: {
  appearance: string;
  emailProduct: boolean;
  emailSecurity: boolean;
  emailMarketing: boolean;
  inAppAlerts: boolean;
  weeklyBrief: boolean;
  updatedAt: Date;
}) {
  return {
    appearance: prefs.appearance,
    notifications: {
      emailProduct: prefs.emailProduct,
      emailSecurity: prefs.emailSecurity,
      emailMarketing: prefs.emailMarketing,
      inAppAlerts: prefs.inAppAlerts,
      weeklyBrief: prefs.weeklyBrief,
    },
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await ensureAccountExtras(auth.sub);
  const prefs = await prisma.userPreferences.findUniqueOrThrow({ where: { userId: auth.sub } });
  return NextResponse.json({ preferences: serialize(prefs) });
}

export async function PATCH(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await ensureAccountExtras(auth.sub);
  const prefs = await prisma.userPreferences.update({
    where: { userId: auth.sub },
    data: parsed.data,
  });

  return NextResponse.json({ preferences: serialize(prefs) });
}
