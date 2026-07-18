import { computeBurnRate } from "@/lib/ml/burnRate";
import type { Transaction } from "@/types/financialContext";

function parseDate(value: string): Date {
  return new Date(value.slice(0, 10) + "T00:00:00Z");
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function canIAffordMath(item: string, amount: number, transactions: Transaction[]) {
  if (!transactions.length) throw new Error("transactions must be a non-empty array");

  const amt = Math.abs(Number(amount));
  if (!Number.isFinite(amt)) throw new Error(`amount must be a number: ${amount}`);

  const itemLabel = String(item || "").trim() || "this purchase";

  const baseline = computeBurnRate(transactions);
  const baselineZero = baseline.projected_zero_balance_date;

  const lastDay = transactions.reduce((max, txn) => {
    const d = txn.date.slice(0, 10);
    return d > max ? d : max;
  }, transactions[0].date.slice(0, 10));

  const hypotheticalTxn: Transaction = {
    date: lastDay,
    category: "shopping",
    amount: amt,
    description: `[hypothetical] ${itemLabel}`,
  };

  const hypo = computeBurnRate([...transactions, hypotheticalTxn]);
  const hypoZero = hypo.projected_zero_balance_date;

  const dayShift = Math.round(
    (parseDate(hypoZero).getTime() - parseDate(baselineZero).getTime()) / 86400000
  );

  const today = isoToday();
  const affordable = hypoZero > today;

  let explanation: string;
  if (affordable) {
    const direction =
      dayShift < 0
        ? `${Math.abs(dayShift)} day(s) earlier`
        : dayShift > 0
          ? `${dayShift} day(s) later`
          : "by 0 days (no change to the projected date)";
    explanation =
      `Yes — you can afford ${itemLabel} (₹${amt.toLocaleString("en-IN")}). ` +
      `It moves your projected zero-balance date ${direction}, ` +
      `from ${baselineZero} to ${hypoZero}.`;
  } else {
    explanation =
      `Not right now — ${itemLabel} (₹${amt.toLocaleString("en-IN")}) would push your projected ` +
      `zero-balance date to ${hypoZero} (${Math.abs(dayShift)} day(s) sooner than ${baselineZero}), ` +
      `which is on or before today (${today}). Consider waiting or trimming other spending first.`;
  }

  return {
    affordable,
    day_shift: dayShift,
    new_zero_balance_date: hypoZero,
    explanation,
  };
}
