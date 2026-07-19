import { CENTROIDS, FEATURE_KEYS } from "@/lib/ml/centroids";
import { classify } from "@/lib/ml/classify";
import type { Transaction } from "@/types/financialContext";

export interface ArchetypeExplanation {
  label: string;
  distances: Record<string, number>;
  nearestCentroid: string;
  featureVector: Record<string, number>;
  /** Per-feature delta vs nearest centroid (positive = spend more than archetype norm). */
  featureDeltas: Record<string, number>;
  topDrivers: { feature: string; delta: number; direction: "above" | "below" }[];
}

function buildFeatureVector(transactions: Transaction[], monthlyIncome: number): Record<string, number> {
  const { label, distances } = classify(transactions, monthlyIncome);
  void label;
  void distances;
  // Re-use classify internals via distances + recompute vector from classify output path
  const CREDIT = new Set(["income", "salary", "credit", "refund", "cashback", "opening_balance", "transfers"]);
  const buckets: Record<string, number> = Object.fromEntries(FEATURE_KEYS.map((k) => [k, 0]));
  const dates: number[] = [];

  for (const txn of transactions) {
    const cat = String(txn.category).toLowerCase();
    if (CREDIT.has(cat) || txn.amount >= 0) continue;
    const bucket =
      cat === "food" || cat === "dining"
        ? "food"
        : cat === "bills" || cat === "rent"
          ? "bills"
          : cat === "entertainment"
            ? "entertainment"
            : cat === "savings"
              ? "savings"
              : "shopping";
    buckets[bucket] += Math.abs(txn.amount);
    dates.push(new Date(txn.date + "T00:00:00Z").getTime());
  }

  let months = 1;
  if (dates.length) {
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    months = Math.max((max - min) / 86400000 / 30.44 + 1 / 30.44, 1);
  }

  const vector: Record<string, number> = {};
  for (const key of FEATURE_KEYS) {
    if (key === "savings") continue;
    vector[key] = buckets[key] / months / monthlyIncome;
  }
  vector.savings = Math.max(
    0,
    1 - FEATURE_KEYS.filter((k) => k !== "savings").reduce((s, k) => s + vector[k], 0)
  );
  return vector;
}

/** K-means-style explanation alongside classify() — does not change classify() contract. */
export function explainArchetype(
  transactions: Transaction[],
  monthlyIncome: number
): ArchetypeExplanation {
  const { label, distances } = classify(transactions, monthlyIncome);
  const featureVector = buildFeatureVector(transactions, monthlyIncome);
  const centroid = CENTROIDS[label];
  const featureDeltas: Record<string, number> = {};
  for (const key of FEATURE_KEYS) {
    featureDeltas[key] = Math.round((featureVector[key] - centroid[key]) * 10000) / 10000;
  }

  const topDrivers = FEATURE_KEYS.map((feature) => ({
    feature,
    delta: featureDeltas[feature],
    direction: (featureDeltas[feature] >= 0 ? "above" : "below") as "above" | "below",
  }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  return {
    label,
    distances,
    nearestCentroid: label,
    featureVector,
    featureDeltas,
    topDrivers,
  };
}
