import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { listTransactionsPage } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Paginated transactions for the active session (descriptions encrypted unless ?decrypt=1). */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
  const decrypt = req.nextUrl.searchParams.get("decrypt") === "1";

  const page = await listTransactionsPage({
    sessionId: auth.sid,
    userId: auth.sub,
    cursor,
    limit,
    decryptDescriptions: decrypt,
  });

  return NextResponse.json(page);
}
