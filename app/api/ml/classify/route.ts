// FORE — app/api/ml/classify/route.ts
// Same-origin proxy to the Render ML service's POST /classify (CONTRACT-002 / CONTRACT-006).
// Keeps RENDER_ML_BASE_URL server-side and CORS trivial for the browser.

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
    key: actorKey(req, "ml-classify", userId),
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
  if (!body?.transactions || typeof body.monthly_income !== "number") {
    return NextResponse.json(
      { error: "transactions[] and monthly_income are required" },
      { status: 400 }
    );
  }
  const result = await callMl("/classify", body);
  if (!result.ok) {
    return NextResponse.json({ error: "Classification failed" }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
