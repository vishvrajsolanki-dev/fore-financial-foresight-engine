import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { hashToken } from "@/lib/security/encryption";
import { COOKIE_REFRESH } from "@/lib/auth/jwt";
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

  const currentRaw = req.cookies.get(COOKIE_REFRESH)?.value;
  const currentHash = currentRaw ? hashToken(currentRaw) : null;

  const rows = await prisma.refreshToken.findMany({
    where: { userId: auth.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tokenHash: true,
      createdAt: true,
      expiresAt: true,
      userAgent: true,
      ipHint: true,
    },
  });

  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      userAgent: r.userAgent,
      ipHint: r.ipHint,
      current: currentHash != null && r.tokenHash === currentHash,
    })),
  });
}

const deleteSchema = z.object({
  sessionId: z.string().min(1).optional(),
  revokeAll: z.boolean().optional(),
});

export async function DELETE(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.revokeAll) {
    await prisma.refreshToken.updateMany({
      where: { userId: auth.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true, revoked: "all" });
  }

  if (!parsed.data.sessionId) {
    return NextResponse.json({ error: "sessionId or revokeAll required" }, { status: 400 });
  }

  const row = await prisma.refreshToken.findFirst({
    where: { id: parsed.data.sessionId, userId: auth.sub },
  });
  if (!row) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true, revoked: row.id });
}
