// FORE — components/PastPanel.tsx
// Owner: TASK-002 (Drashti). Archetype label + radar chart (distances) + burn-rate line (Recharts).
// Data source: lib/api/pastClient.ts — must go through that single module, never a direct fetch
// here, so the PLACEHOLDER-A -> real swap at Checkpoint-1 stays a one-file change.
// Edge case: no persona selected -> prompt state, must not crash.

"use client";

export default function PastPanel() {
  // TODO(TASK-002): call getPastData() from lib/api/pastClient.ts, render:
  //   - archetype.label
  //   - Recharts radar chart over archetype.distances
  //   - burn_rate line chart (daily_avg, trend_slope, projected_zero_balance_date)
  return <div>PAST — TASK-002 not yet implemented</div>;
}
