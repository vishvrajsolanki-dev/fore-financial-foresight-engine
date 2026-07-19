import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { issueAuthToken } from "@/lib/auth/tokens";
import { appBaseUrl, sendEmail } from "@/lib/email/send";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(255),
});

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const limited = await rateLimit({
    key: clientKey(req, "auth-forgot"),
    limit: 10,
    windowMs: 60 * 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return ok to avoid email enumeration.
  const base = {
    ok: true as const,
    message: "If that email exists, a reset link has been issued.",
  };

  if (!user || !user.passwordHash) {
    return NextResponse.json(base);
  }

  const raw = await issueAuthToken(user.id, "password_reset");
  const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(raw)}`;
  const mail = await sendEmail({
    to: user.email,
    subject: "Reset your FORE password",
    text: `Reset your password (expires in 1 hour):\n\n${link}\n`,
  });

  return NextResponse.json({
    ...base,
    ...(mail.preview ? { devResetToken: raw, devResetLink: link } : {}),
  });
}
