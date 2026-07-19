import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

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

  const consent = await prisma.userConsent.findUnique({ where: { userId: auth.sub } });
  return NextResponse.json({
    consent: consent
      ? {
          csvUploadAt: consent.csvUploadAt?.toISOString() ?? null,
          aiProcessingAt: consent.aiProcessingAt?.toISOString() ?? null,
          benchmarkOptInAt: consent.benchmarkOptInAt?.toISOString() ?? null,
          privacyAcceptedAt: consent.privacyAcceptedAt?.toISOString() ?? null,
        }
      : null,
  });
}

const postSchema = z.object({
  privacyAccepted: z.boolean().optional(),
  benchmarkOptIn: z.boolean().optional(),
  aiProcessing: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const now = new Date();
  const data: Record<string, Date> = {};
  if (parsed.data.privacyAccepted) data.privacyAcceptedAt = now;
  if (parsed.data.benchmarkOptIn) data.benchmarkOptInAt = now;
  if (parsed.data.aiProcessing) data.aiProcessingAt = now;

  const consent = await prisma.userConsent.upsert({
    where: { userId: auth.sub },
    create: { userId: auth.sub, ...data },
    update: data,
  });

  return NextResponse.json({
    consent: {
      csvUploadAt: consent.csvUploadAt?.toISOString() ?? null,
      aiProcessingAt: consent.aiProcessingAt?.toISOString() ?? null,
      benchmarkOptInAt: consent.benchmarkOptInAt?.toISOString() ?? null,
      privacyAcceptedAt: consent.privacyAcceptedAt?.toISOString() ?? null,
    },
  });
}
