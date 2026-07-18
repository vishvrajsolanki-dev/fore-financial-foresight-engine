import { CENTROIDS, FEATURE_KEYS } from "@/lib/ml/centroids";
import type { Transaction } from "@/types/financialContext";

const CATEGORY_MAP: Record<string, string> = {
  food: "food", dining: "food", groceries: "food", restaurant: "food", restaurants: "food",
  delivery: "food", cafe: "food", shopping: "shopping", clothes: "shopping", clothing: "shopping",
  electronics: "shopping", "online shopping": "shopping", bills: "bills", rent: "bills",
  utilities: "bills", emi: "bills", insurance: "bills", recharge: "bills", transport: "bills",
  commute: "bills", fuel: "bills", health: "bills", education: "bills", entertainment: "entertainment",
  movies: "entertainment", outings: "entertainment", events: "entertainment",
  subscriptions: "entertainment", travel: "entertainment", gaming: "entertainment",
  savings: "savings", investment: "savings", investments: "savings", sip: "savings",
  "mutual fund": "savings", deposit: "savings", fd: "savings", rd: "savings",
};

const CREDIT_CATEGORIES = new Set(["income", "salary", "credit", "refund", "cashback", "opening_balance"]);
const AVG_DAYS_PER_MONTH = 30.44;

function parseDate(value: string): Date {
  return new Date(value.slice(0, 10) + "T00:00:00Z");
}

function buildFeatureVector(transactions: Transaction[], monthlyIncome: number): Record<string, number> {
  if (monthlyIncome <= 0) throw new Error("monthly_income must be a positive number");

  const buckets: Record<string, number> = Object.fromEntries(FEATURE_KEYS.map((k) => [k, 0]));
  const dates: Date[] = [];

  for (const txn of transactions) {
    const category = String(txn.category ?? "").trim().toLowerCase();
    const amount = Number(txn.amount);
    if (CREDIT_CATEGORIES.has(category)) continue;
    const bucket = CATEGORY_MAP[category] ?? "shopping";
    buckets[bucket] += Math.abs(amount);
    dates.push(parseDate(txn.date));
  }

  let months = 1;
  if (dates.length) {
    const min = Math.min(...dates.map((d) => d.getTime()));
    const max = Math.max(...dates.map((d) => d.getTime()));
    const windowDays = Math.floor((max - min) / 86400000) + 1;
    months = Math.max(windowDays / AVG_DAYS_PER_MONTH, 1);
  }

  const vector: Record<string, number> = {};
  for (const key of FEATURE_KEYS) {
    if (key === "savings") continue;
    vector[key] = (buckets[key] / months) / monthlyIncome;
  }
  vector.savings = Math.max(0, 1 - FEATURE_KEYS.filter((k) => k !== "savings").reduce((s, k) => s + vector[k], 0));
  return vector;
}

export function classify(transactions: Transaction[], monthlyIncome: number) {
  const sample = buildFeatureVector(transactions, monthlyIncome);
  const distances: Record<string, number> = {};
  for (const [label, centroid] of Object.entries(CENTROIDS)) {
    let sum = 0;
    for (const key of FEATURE_KEYS) {
      const d = sample[key] - centroid[key];
      sum += d * d;
    }
    distances[label] = Math.round(Math.sqrt(sum) * 10000) / 10000;
  }
  const label = Object.entries(distances).reduce((a, b) => (a[1] <= b[1] ? a : b))[0];
  return { label, distances };
}
