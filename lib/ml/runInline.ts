import { classify } from "@/lib/ml/classify";
import { computeBurnRate } from "@/lib/ml/burnRate";
import { canIAffordMath } from "@/lib/ml/canIAfford";
import type { Transaction } from "@/types/financialContext";

export function isInlineMl(): boolean {
  const mode = process.env.ML_MODE?.trim().toLowerCase();
  if (mode === "render" || mode === "external") return false;
  if (mode === "inline" || mode === "local") return true;
  return !process.env.RENDER_ML_BASE_URL?.trim();
}

export async function runInlineMl<T>(path: string, body: unknown): Promise<T> {
  if (path === "/classify") {
    const b = body as { transactions: Transaction[]; monthly_income: number };
    return classify(b.transactions, b.monthly_income) as T;
  }
  if (path === "/burn-rate") {
    const b = body as { transactions: Transaction[] };
    return computeBurnRate(b.transactions) as T;
  }
  if (path === "/can-i-afford") {
    const b = body as { item: string; amount: number; transactions: Transaction[] };
    return canIAffordMath(b.item, b.amount, b.transactions) as T;
  }
  throw new Error(`Unknown ML path: ${path}`);
}
