// FORE — lib/benchmark/computeBenchmark.ts
// Shared peer-benchmark percentile math (CONTRACT-005). Writes results into financial_context
// so PAST, DECIDE, and AHEAD share one spine — not three independent calculations.

import benchmark from "@/data/benchmark.json";
import { features } from "@/lib/features";
import type { FinancialContext, Transaction } from "@/types/financialContext";

interface Percentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface BenchCategory {
  category: string;
  percentiles: Percentiles;
}

interface BenchRow {
  income_bracket: string;
  city_tier: string;
  categories: BenchCategory[];
}

const AVG_DAYS_PER_MONTH = 30.44;

function monthsInWindow(transactions: Transaction[]): number {
  if (transactions.length < 2) return 1;
  const dates = transactions.map((t) => t.date).sort();
  const min = new Date(dates[0] + "T00:00:00Z").getTime();
  const max = new Date(dates[dates.length - 1] + "T00:00:00Z").getTime();
  const days = Math.floor((max - min) / 86400000) + 1;
  return Math.max(days / AVG_DAYS_PER_MONTH, 1);
}

export function estimatePercentile(value: number, p: Percentiles): number {
  const points: [number, number][] = [
    [0, 0],
    [p.p25, 25],
    [p.p50, 50],
    [p.p75, 75],
    [p.p90, 90],
  ];
  if (value >= p.p90) return Math.min(99, 90 + ((value - p.p90) / Math.max(1, p.p90)) * 9);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (value <= x1) {
      const t = x1 === x0 ? 0 : (value - x0) / (x1 - x0);
      return Math.round(y0 + t * (y1 - y0));
    }
  }
  return 90;
}

function monthlySpendByCategory(transactions: Transaction[]): Record<string, number> {
  const totals: Record<string, number> = {};
  const months = monthsInWindow(transactions);
  for (const t of transactions) {
    if (t.amount < 0) totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
  }
  for (const k of Object.keys(totals)) totals[k] = totals[k] / months;
  return totals;
}

export function findBenchmarkRow(
  incomeBracket: string,
  cityTier: string
): BenchRow | undefined {
  return (benchmark as { brackets: BenchRow[] }).brackets.find(
    (b) => b.income_bracket === incomeBracket && b.city_tier === cityTier
  );
}

export function computeBenchmark(
  transactions: Transaction[],
  incomeBracket: string,
  cityTier: string
): NonNullable<FinancialContext["benchmark"]> | null {
  const row = findBenchmarkRow(incomeBracket, cityTier);
  if (!row) return null;

  const userMonthly = monthlySpendByCategory(transactions);
  const rows = row.categories.map((c) => ({
    category: c.category,
    user_value: userMonthly[c.category] || 0,
    percentile: estimatePercentile(userMonthly[c.category] || 0, c.percentiles),
  }));

  // Transport row is only shown when the statement actually has transport-labelled spend.
  // (Previously invented as 22% of bills — removed as misleading.)
  void features.transportBenchmark;

  return rows;
}
