import { NextRequest, NextResponse } from "next/server";

import { isAuthPayload, requireAuth } from "@/lib/auth/session";
import { loadSessionTransactions, sessionToSpine } from "@/lib/db/contextService";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { computeBurnRate } from "@/lib/ml/burnRate";
import { detectRecurring } from "@/lib/ml/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ alerts: [], note: "Demo mode — no persisted alerts" });
  }

  const auth = await requireAuth(req);
  if (!isAuthPayload(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const spine = await sessionToSpine(auth.sid, auth.sub);
  const transactions = await loadSessionTransactions(auth.sid, auth.sub);
  if (!spine || !transactions.length) {
    return NextResponse.json({ alerts: [] });
  }

  const alerts: {
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    detail: string;
  }[] = [];

  const burn = spine.burn_rate ?? computeBurnRate(transactions);
  const recurring = detectRecurring(transactions);

  if (burn.trend_slope < -100) {
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
  if (subTotal > spine.monthly_income * 0.15 && recurring.length >= 2) {
    alerts.push({
      type: "subscription_creep",
      severity: "warning",
      title: "Subscription creep",
      detail: `${recurring.length} recurring merchants (~₹${subTotal.toLocaleString("en-IN")}/mo): ${recurring
        .slice(0, 3)
        .map((r) => r.merchant)
        .join(", ")}.`,
    });
  }

  const last30 = transactions.filter((t) => {
    const d = new Date(t.date + "T00:00:00Z").getTime();
    return Date.now() - d < 30 * 86400000 && t.amount < 0;
  });
  const spend30 = last30.reduce((s, t) => s + Math.abs(t.amount), 0);
  const prior30 = transactions.filter((t) => {
    const d = new Date(t.date + "T00:00:00Z").getTime();
    const age = Date.now() - d;
    return age >= 30 * 86400000 && age < 60 * 86400000 && t.amount < 0;
  });
  const spendPrior = prior30.reduce((s, t) => s + Math.abs(t.amount), 0);
  if (spendPrior > 0 && spend30 > spendPrior * 1.35) {
    alerts.push({
      type: "anomaly_spend",
      severity: "info",
      title: "Spending spike",
      detail: `Last 30 days spend (₹${Math.round(spend30).toLocaleString("en-IN")}) is ${Math.round(
        (spend30 / spendPrior - 1) * 100
      )}% higher than the prior month.`,
    });
  }

  return NextResponse.json({ alerts, recurring });
}
