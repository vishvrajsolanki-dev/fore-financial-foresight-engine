import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { loadSessionTransactions } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { buildReportPreview, type ReportMetrics } from "@/lib/reports/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metrics: z
    .array(z.enum(["spend_by_category", "spend_by_merchant", "cashflow", "transactions"]))
    .optional(),
  category: z.string().max(64).optional(),
  merchant: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const transactions = await loadSessionTransactions(auth.sid, auth.sub);
  const metrics = (parsed.data.metrics ?? [
    "spend_by_category",
    "spend_by_merchant",
    "cashflow",
    "transactions",
  ]) as ReportMetrics[];

  const preview = buildReportPreview(transactions, {
    from: parsed.data.from,
    to: parsed.data.to,
    metrics,
    category: parsed.data.category,
    merchant: parsed.data.merchant,
  });

  return NextResponse.json({ preview });
}
