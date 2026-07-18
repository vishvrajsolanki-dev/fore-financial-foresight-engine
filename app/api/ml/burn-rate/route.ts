// FORE — app/api/ml/burn-rate/route.ts
// Same-origin proxy to the Render ML service's POST /burn-rate (CONTRACT-003 / CONTRACT-006).

import { NextRequest, NextResponse } from "next/server";
import { callMl } from "@/lib/api/mlServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.transactions) {
    return NextResponse.json({ error: "transactions[] is required" }, { status: 400 });
  }
  const result = await callMl("/burn-rate", body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
