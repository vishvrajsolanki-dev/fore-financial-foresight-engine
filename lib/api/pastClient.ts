// FORE — lib/api/pastClient.ts
// Owner: TASK-002 (Drashti). Single client module so the PLACEHOLDER-A -> real swap at
// Checkpoint-1 is a one-file change (mandatory constraint, see docs/TASK-002_handout.md).
//
// CURRENT STATE: PLACEHOLDER-A (exact shape locked in docs/CONTRACTS.md).
// AT CHECKPOINT-1: replace the hardcoded object below with real fetch calls to
//   POST {RENDER_ML_BASE_URL}/classify   (CONTRACT-002)
//   POST {RENDER_ML_BASE_URL}/burn-rate  (CONTRACT-003)
// per TASK-003's Placeholder Replacement Note, then delete the hardcoded object entirely.

import type { FinancialContext } from "@/types/financialContext";

const PLACEHOLDER_A: Pick<FinancialContext, "archetype" | "burn_rate"> = {
  archetype: {
    label: "Balanced Spender",
    distances: {
      "Disciplined Saver": 4.2,
      "Impulsive Spender": 6.1,
      "The Foodie": 5.5,
      "Social Butterfly": 5.8,
      "Balanced Spender": 1.9,
    },
  },
  burn_rate: {
    daily_avg: 850,
    trend_slope: -12.5,
    projected_zero_balance_date: "2026-09-14",
  },
};

export async function getPastData(): Promise<
  Pick<FinancialContext, "archetype" | "burn_rate">
> {
  // TODO(TASK-003 swap): replace with real fetch calls once Vishvraj's endpoints are live.
  // const baseUrl = process.env.RENDER_ML_BASE_URL;
  // const [archetypeRes, burnRateRes] = await Promise.all([
  //   fetch(`${baseUrl}/classify`, { method: "POST", ... }),
  //   fetch(`${baseUrl}/burn-rate`, { method: "POST", ... }),
  // ]);
  return PLACEHOLDER_A;
}
