import { prisma } from "@/lib/db/prisma";
import type { Transaction } from "@/types/financialContext";

const SPEND_CATEGORIES = ["food", "shopping", "bills", "entertainment", "savings"] as const;

function monthlySpendByCategory(transactions: Transaction[]): Record<string, number> {
  const totals: Record<string, number> = {};
  const dates = transactions.map((t) => t.date).sort();
  if (!dates.length) return totals;
  const windowDays =
    Math.floor(
      (new Date(dates[dates.length - 1] + "T00:00:00Z").getTime() -
        new Date(dates[0] + "T00:00:00Z").getTime()) /
        86400000
    ) + 1;
  const months = Math.max(windowDays / 30.44, 1);

  for (const txn of transactions) {
    if (txn.amount >= 0) continue;
    const cat = txn.category in totals ? txn.category : "shopping";
    totals[cat] = (totals[cat] || 0) + Math.abs(txn.amount);
  }

  const monthly: Record<string, number> = {};
  for (const [cat, total] of Object.entries(totals)) {
    monthly[cat] = total / months;
  }
  return monthly;
}

/** Running percentile approximation (P² simplified: blend toward new sample). */
function blendPercentile(prev: number, sample: number, weight: number): number {
  return prev + (sample - prev) * weight;
}

/** Contribute anonymized category spends when user opted in. */
export async function contributeBenchmarkAggregate(opts: {
  incomeBracket: string;
  cityTier: string;
  transactions: Transaction[];
}): Promise<void> {
  const monthly = monthlySpendByCategory(opts.transactions);

  for (const category of SPEND_CATEGORIES) {
    const value = monthly[category] ?? 0;
    if (value <= 0) continue;

    const existing = await prisma.benchmarkAggregate.findUnique({
      where: {
        incomeBracket_cityTier_category: {
          incomeBracket: opts.incomeBracket,
          cityTier: opts.cityTier,
          category,
        },
      },
    });

    if (!existing) {
      await prisma.benchmarkAggregate.create({
        data: {
          incomeBracket: opts.incomeBracket,
          cityTier: opts.cityTier,
          category,
          p25: value * 0.75,
          p50: value,
          p75: value * 1.25,
          p90: value * 1.5,
          sampleCount: 1,
        },
      });
      continue;
    }

    const w = 1 / (existing.sampleCount + 1);
    await prisma.benchmarkAggregate.update({
      where: { id: existing.id },
      data: {
        p25: blendPercentile(existing.p25, value * 0.75, w),
        p50: blendPercentile(existing.p50, value, w),
        p75: blendPercentile(existing.p75, value * 1.25, w),
        p90: blendPercentile(existing.p90, value * 1.5, w),
        sampleCount: existing.sampleCount + 1,
      },
    });
  }
}
