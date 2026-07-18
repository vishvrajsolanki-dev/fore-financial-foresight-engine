import type { Transaction } from "@/types/financialContext";

const CREDIT_CATEGORIES = new Set(["income", "salary", "credit", "refund", "cashback", "opening_balance"]);
const PROJECTION_CAP_DAYS = 3650;

function parseDate(value: string): Date {
  return new Date(value.slice(0, 10) + "T00:00:00Z");
}

function signedAmount(txn: Transaction): number {
  const amount = Number(txn.amount);
  const category = String(txn.category ?? "").trim().toLowerCase();
  if (CREDIT_CATEGORIES.has(category)) return Math.abs(amount);
  return -Math.abs(amount);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeBurnRate(transactions: Transaction[]) {
  if (!transactions.length) throw new Error("transactions must be a non-empty array");

  const dated = transactions.map((txn) => {
    const dt = parseDate(txn.date);
    if (Number.isNaN(dt.getTime())) throw new Error(`transaction missing a valid ISO date: ${JSON.stringify(txn)}`);
    return [dt, signedAmount(txn)] as const;
  });
  dated.sort((a, b) => a[0].getTime() - b[0].getTime());

  const firstDay = dated[0][0];
  const lastDay = dated[dated.length - 1][0];
  const windowDays = Math.floor((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1;

  const totalSpend = dated.filter(([, amt]) => amt < 0).reduce((s, [, amt]) => s + -amt, 0);
  const dailyAvg = totalSpend / windowDays;

  const dailyNet = new Array<number>(windowDays).fill(0);
  for (const [txnDate, amt] of dated) {
    const idx = Math.floor((txnDate.getTime() - firstDay.getTime()) / 86400000);
    dailyNet[idx] += amt;
  }

  const balances: number[] = [];
  let running = 0;
  for (const net of dailyNet) {
    running += net;
    balances.push(running);
  }

  const n = windowDays;
  let slope = 0;
  if (n >= 2) {
    const meanT = (n - 1) / 2;
    const meanB = balances.reduce((a, b) => a + b, 0) / n;
    const varT = Array.from({ length: n }, (_, t) => (t - meanT) ** 2).reduce((a, b) => a + b, 0);
    const covTb = Array.from({ length: n }, (_, t) => (t - meanT) * (balances[t] - meanB)).reduce((a, b) => a + b, 0);
    slope = covTb / varT;
  }

  let fittedLast: number;
  if (n < 2) {
    fittedLast = balances[balances.length - 1];
  } else {
    const meanT = (n - 1) / 2;
    const meanB = balances.reduce((a, b) => a + b, 0) / n;
    fittedLast = meanB + slope * ((n - 1) - meanT);
  }

  let daysToZero: number;
  if (slope < 0 && fittedLast > 0) {
    daysToZero = Math.min(Math.floor(fittedLast / -slope) + 1, PROJECTION_CAP_DAYS);
  } else if (fittedLast <= 0) {
    daysToZero = 0;
  } else {
    daysToZero = PROJECTION_CAP_DAYS;
  }

  return {
    daily_avg: Math.round(dailyAvg * 100) / 100,
    trend_slope: Math.round(slope * 100) / 100,
    projected_zero_balance_date: isoDate(addDays(lastDay, daysToZero)),
  };
}
