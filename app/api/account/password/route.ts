import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid password payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Password change unavailable for this sign-in method" },
      { status: 400 }
    );
  }

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: auth.sub },
    data: { passwordHash },
  });

  await prisma.refreshToken.updateMany({
    where: { userId: auth.sub, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true, sessionsRevoked: true });
}
