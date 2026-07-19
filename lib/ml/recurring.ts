import type { Transaction } from "@/types/financialContext";

export interface RecurringMerchant {
  merchant: string;
  category: string;
  avgAmount: number;
  cadenceDays: number;
  occurrences: number;
  lastDate: string;
  monthlyEstimate: number;
}

const MIN_OCCURRENCES = 3;
const AMOUNT_TOLERANCE = 0.15;
const CADENCE_MIN_DAYS = 25;
const CADENCE_MAX_DAYS = 35;

function groupKey(txn: Transaction): string | null {
  const merchant = (txn.merchant || txn.description || "").trim().toLowerCase();
  if (!merchant || txn.amount >= 0) return null;
  return merchant.slice(0, 64);
}

/** Detect subscription-like merchants: similar amount + ~monthly cadence. */
export function detectRecurring(transactions: Transaction[]): RecurringMerchant[] {
  const groups = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const key = groupKey(txn);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(txn);
    groups.set(key, list);
  }

  const results: RecurringMerchant[] = [];

  for (const [merchant, txns] of groups) {
    if (txns.length < MIN_OCCURRENCES) continue;

    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sorted.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountStable = amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount <= AMOUNT_TOLERANCE
    );
    if (!amountStable) continue;

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d0 = new Date(sorted[i - 1].date + "T00:00:00Z").getTime();
      const d1 = new Date(sorted[i].date + "T00:00:00Z").getTime();
      gaps.push(Math.round((d1 - d0) / 86400000));
    }
    const cadenceDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (cadenceDays < CADENCE_MIN_DAYS || cadenceDays > CADENCE_MAX_DAYS) continue;

    const monthlyEstimate = Math.round((30.44 / cadenceDays) * avgAmount);
    results.push({
      merchant,
      category: sorted[0].category,
      avgAmount: Math.round(avgAmount),
      cadenceDays,
      occurrences: sorted.length,
      lastDate: sorted[sorted.length - 1].date,
      monthlyEstimate,
    });
  }

  return results.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
}
