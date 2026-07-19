import type { Transaction } from "@/types/financialContext";

const CREDIT_CATEGORIES = new Set(["income", "salary", "credit", "refund", "cashback", "opening_balance"]);
const PROJECTION_CAP_DAYS = 3650;

function parseDate(value: string): Date {
  return new Date(value.slice(0, 10) + "T00:00:00Z");
}

function signedAmount(txn: Transaction): number {
  const amount = Number(txn.amount);
  const category = String(txn.category ?? "").trim().toLowerCase();
  if (category === "transfers") return amount;
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

/** Day-of-week spend multipliers (Sun=0 … Sat=6); 1.0 = average. */
function weeklySeasonalFactors(dated: [Date, number][]): number[] {
  const dowSpend = new Array(7).fill(0);
  const dowCount = new Array(7).fill(0);

  for (const [dt, amt] of dated) {
    if (amt >= 0) continue;
    const dow = dt.getUTCDay();
    dowSpend[dow] += -amt;
    dowCount[dow]++;
  }

  const dailyAvgs = dowSpend.map((s, i) => (dowCount[i] ? s / dowCount[i] : 0));
  const overall = dailyAvgs.reduce((a, b) => a + b, 0) / 7 || 1;
  return dailyAvgs.map((v) => (overall > 0 ? Math.round((v / overall) * 1000) / 1000 : 1));
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
  const weeklySeasonal = weeklySeasonalFactors(dated as [Date, number][]);

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

  // Residual std for prediction interval on zero-crossing day
  let residualStd = 0;
  if (n >= 3) {
    const meanT = (n - 1) / 2;
    const meanB = balances.reduce((a, b) => a + b, 0) / n;
    const residuals = balances.map((b, t) => b - (meanB + slope * (t - meanT)));
    const mse = residuals.reduce((s, r) => s + r * r, 0) / (n - 2);
    residualStd = Math.sqrt(mse);
  }

  // Trend-based zero (OLS) — informational; can be far out if net-accumulating.
  let trendDaysToZero: number;
  if (slope < 0 && fittedLast > 0) {
    trendDaysToZero = Math.min(Math.floor(fittedLast / -slope) + 1, PROJECTION_CAP_DAYS);
  } else if (fittedLast <= 0) {
    trendDaysToZero = 0;
  } else {
    trendDaysToZero = PROJECTION_CAP_DAYS;
  }
  const trendZero = isoDate(addDays(lastDay, trendDaysToZero));

  // Primary "projected zero" = runway if income/credits stopped (matches PAST caption).
  const lastBalance = balances[balances.length - 1] ?? 0;
  let runwayDays: number;
  if (lastBalance <= 0) runwayDays = 0;
  else if (dailyAvg <= 0) runwayDays = PROJECTION_CAP_DAYS;
  else runwayDays = Math.min(Math.floor(lastBalance / dailyAvg), PROJECTION_CAP_DAYS);
  const projected = isoDate(addDays(lastDay, runwayDays));

  const intervalDays = slope < 0 && residualStd > 0 ? Math.round(residualStd / Math.abs(slope)) : 0;
  const projectedLow = isoDate(addDays(lastDay, Math.max(0, runwayDays - intervalDays)));
  const projectedHigh = isoDate(addDays(lastDay, Math.min(runwayDays + intervalDays, PROJECTION_CAP_DAYS)));

  return {
    daily_avg: Math.round(dailyAvg * 100) / 100,
    trend_slope: Math.round(slope * 100) / 100,
    projected_zero_balance_date: projected,
    weekly_seasonal: weeklySeasonal,
    projected_zero_balance_date_low: projectedLow,
    projected_zero_balance_date_high: projectedHigh,
    trend_zero_balance_date: trendZero,
    runway_days_if_income_stopped: runwayDays,
  };
}
