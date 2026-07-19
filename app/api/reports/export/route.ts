import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { loadSessionTransactions } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { buildReportPreview, transactionsToCsv } from "@/lib/reports/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().max(64).optional(),
  merchant: z.string().max(128).optional(),
  format: z.enum(["csv", "json"]).default("csv"),
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
  const preview = buildReportPreview(transactions, {
    from: parsed.data.from,
    to: parsed.data.to,
    metrics: ["transactions", "spend_by_category", "spend_by_merchant", "cashflow"],
    category: parsed.data.category,
    merchant: parsed.data.merchant,
  });

  if (parsed.data.format === "json") {
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      ...preview,
    });
  }

  const csv = transactionsToCsv(preview.transactions);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fore-report.csv"`,
    },
  });
}
