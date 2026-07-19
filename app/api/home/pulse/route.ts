import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { loadSessionTransactions, sessionToContext } from "@/lib/db/contextService";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { buildHomePulse, type PulseAlert } from "@/lib/home/pulse";
import { computeBurnRate } from "@/lib/ml/burnRate";
import { detectRecurring } from "@/lib/ml/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Thin home pulse — assembles persisted spine + alert heuristics.
 * Does not re-run classify / canIAfford; uses stored burn when present.
 */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const session = await prisma.financialSession.findFirst({
    where: { id: auth.sid, userId: auth.sub, isActive: true },
    select: { dataSource: true },
  });

  const ctx = await sessionToContext(auth.sid, {
    userId: auth.sub,
    decryptDescriptions: false,
  });

  const alerts: PulseAlert[] = [];
  if (ctx) {
    const transactions = await loadSessionTransactions(auth.sid, auth.sub);
    const burn = ctx.burn_rate ?? (transactions.length ? computeBurnRate(transactions) : null);
    const recurring = transactions.length ? detectRecurring(transactions) : [];

    if (burn && burn.trend_slope < -100) {
      const daysLeft = Math.max(
        0,
        Math.floor(
          (new Date(burn.projected_zero_balance_date + "T00:00:00Z").getTime() - Date.now()) /
            86400000
        )
      );
      if (daysLeft < 90) {
        alerts.push({
          type: "runway_shrinking",
          severity: daysLeft < 30 ? "critical" : "warning",
          title: "Runway shrinking",
          detail: `At the current trend, balance may hit zero around ${burn.projected_zero_balance_date} (${daysLeft} days).`,
        });
      }
    }

    const subTotal = recurring.reduce((s, r) => s + r.monthlyEstimate, 0);
    if (subTotal > ctx.monthly_income * 0.15 && recurring.length >= 2) {
      alerts.push({
        type: "subscription_creep",
        severity: "warning",
        title: "Subscription creep",
        detail: `${recurring.length} recurring merchants (~₹${subTotal.toLocaleString("en-IN")}/mo).`,
      });
    }
  }

  const pulse = buildHomePulse(ctx, {
    dataSource: session?.dataSource ?? null,
    alerts,
  });

  return NextResponse.json({ pulse });
}
