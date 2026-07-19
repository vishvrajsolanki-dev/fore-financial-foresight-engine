import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { issueAuthToken } from "@/lib/auth/tokens";
import { appBaseUrl, sendEmail } from "@/lib/email/send";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const limited = await rateLimit({
    key: clientKey(req, "auth-resend-verify"),
    limit: 10,
    windowMs: 60 * 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const raw = await issueAuthToken(user.id, "email_verify");
  const link = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
  const mail = await sendEmail({
    to: user.email,
    subject: "Verify your FORE email",
    text: `Verify your email (expires in 24 hours):\n\n${link}\n`,
  });

  return NextResponse.json({
    ok: true,
    ...(mail.preview ? { devVerifyToken: raw, devVerifyLink: link } : {}),
  });
}
