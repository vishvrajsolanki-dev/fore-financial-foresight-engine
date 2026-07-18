// FORE — lib/api/pastClient.ts
// Owner: TASK-002 (Drashti). Single client module so the PLACEHOLDER-A -> real swap at
// Checkpoint-1 is a one-file change (mandatory constraint, see docs/TASK-002_handout.md).
//
// STATE: PLACEHOLDER-A has been swapped for real fetch calls (Checkpoint-1 complete), per
// TASK-003's Placeholder Replacement Note. The hardcoded stub has been deleted entirely, as
// the note instructs. Data now comes from the Render ML service via our same-origin proxy:
//   POST /api/ml/classify   (CONTRACT-002)  -> archetype
//   POST /api/ml/burn-rate  (CONTRACT-003)  -> burn_rate

import type { FinancialContext, Transaction } from "@/types/financialContext";

type PastData = Pick<FinancialContext, "archetype" | "burn_rate">;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function getPastData(
  transactions: Transaction[],
  monthlyIncome: number
): Promise<PastData> {
  const [archetype, burn_rate] = await Promise.all([
    postJson<FinancialContext["archetype"]>("/api/ml/classify", {
      transactions,
      monthly_income: monthlyIncome,
    }),
    postJson<FinancialContext["burn_rate"]>("/api/ml/burn-rate", { transactions }),
  ]);
  return { archetype, burn_rate };
}
