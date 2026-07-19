import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { consumeAuthToken } from "@/lib/auth/tokens";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20).max(200),
});

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const limited = await rateLimit({
    key: clientKey(req, "auth-verify"),
    limit: 30,
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
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const consumed = await consumeAuthToken(parsed.data.token, "email_verify");
  if (!consumed) {
    return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: consumed.userId },
    data: { emailVerifiedAt: new Date() },
  });

  return NextResponse.json({ ok: true, verified: true });
}
