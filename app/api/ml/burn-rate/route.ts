// FORE — app/api/ml/burn-rate/route.ts
// Same-origin proxy to the Render ML service's POST /burn-rate (CONTRACT-003 / CONTRACT-006).

import { NextRequest, NextResponse } from "next/server";
import { callMl } from "@/lib/api/mlServer";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = rateLimit({ key: clientKey(req, "ml-burn"), limit: 60, windowMs: 60_000 });
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
