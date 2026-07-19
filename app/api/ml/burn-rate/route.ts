// FORE — app/api/ml/burn-rate/route.ts
// Same-origin proxy to the Render ML service's POST /burn-rate (CONTRACT-003 / CONTRACT-006).

import { NextRequest, NextResponse } from "next/server";
import { callMl } from "@/lib/api/mlServer";
import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { actorKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  if (isDatabaseConfigured()) {
    const auth = await requireAuth(req);
    if (!isAuthPayload(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    userId = auth.sub;
  }

  const limited = await rateLimit({
    key: actorKey(req, "ml-burn", userId),
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.transactions) {
    return NextResponse.json({ error: "transactions[] is required" }, { status: 400 });
  }
  const result = await callMl("/burn-rate", body);
  if (!result.ok) {
    return NextResponse.json({ error: "Burn-rate computation failed" }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
