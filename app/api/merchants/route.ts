import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { loadSessionTransactions } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { aggregateMerchant, listMerchants } from "@/lib/merchants/aggregate";

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

  const merchant = req.nextUrl.searchParams.get("merchant")?.trim();
  const transactions = await loadSessionTransactions(auth.sid, auth.sub);

  if (merchant) {
    const detail = aggregateMerchant(transactions, merchant);
    if (!detail) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }
    return NextResponse.json({ merchant: detail });
  }

  return NextResponse.json({ merchants: listMerchants(transactions) });
}
