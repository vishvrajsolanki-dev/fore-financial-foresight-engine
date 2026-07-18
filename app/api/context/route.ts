import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { patchSessionContext, sessionToContext } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import type { FinancialContext } from "@/types/financialContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const ctx = await sessionToContext(auth.sid);
  if (!ctx) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ context: ctx });
}

export async function PATCH(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const patch = body as Partial<{
    goal: FinancialContext["goal"];
    last_decide_verdict: FinancialContext["last_decide_verdict"];
    burn_rate: FinancialContext["burn_rate"];
  }>;

  const ok = await patchSessionContext(auth.sid, auth.sub, {
    goal: patch.goal,
    lastDecideVerdict: patch.last_decide_verdict,
    burnRate: patch.burn_rate,
  });

  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const ctx = await sessionToContext(auth.sid);
  return NextResponse.json({ context: ctx });
}
