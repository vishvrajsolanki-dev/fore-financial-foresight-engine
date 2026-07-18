// FORE — app/api/ml/classify/route.ts
// Same-origin proxy to the Render ML service's POST /classify (CONTRACT-002 / CONTRACT-006).
// Keeps RENDER_ML_BASE_URL server-side and CORS trivial for the browser.

import { NextRequest, NextResponse } from "next/server";
import { callMl } from "@/lib/api/mlServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.transactions || typeof body.monthly_income !== "number") {
    return NextResponse.json(
      { error: "transactions[] and monthly_income are required" },
      { status: 400 }
    );
  }
  const result = await callMl("/classify", body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
