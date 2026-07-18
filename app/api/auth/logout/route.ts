import { NextRequest, NextResponse } from "next/server";

import { COOKIE_ACCESS, COOKIE_REFRESH, cookieOptions } from "@/lib/auth/jwt";
import { hashToken } from "@/lib/security/encryption";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const refreshRaw = req.cookies.get(COOKIE_REFRESH)?.value;
  if (refreshRaw) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshRaw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ACCESS, "", { ...cookieOptions(0), maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, "", { ...cookieOptions(0), maxAge: 0 });
  return res;
}
