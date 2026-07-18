// FORE — components/BenchmarkPanel.tsx
// Owner: TASK-006 (Drashti). Static peer-benchmark percentile panel, sourced from data/benchmark.json
// (CONTRACT-005) for the active persona's income bracket / city tier.

"use client";

import { useMemo } from "react";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { getPersona } from "@/lib/data/personas";
import benchmark from "@/data/benchmark.json";

interface Percentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}
interface BenchCategory {
  category: string;
  percentiles: Percentiles;
}
interface BenchRow {
  income_bracket: string;
  city_tier: string;
  categories: BenchCategory[];
}

const BENCH_MONTHS = 3;

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// Piecewise-linear percentile estimate from the 4 known percentile points.
function estimatePercentile(value: number, p: Percentiles): number {
  const points: [number, number][] = [
    [0, 0],
    [p.p25, 25],
    [p.p50, 50],
    [p.p75, 75],
    [p.p90, 90],
  ];
  if (value >= p.p90) return Math.min(99, 90 + ((value - p.p90) / Math.max(1, p.p90)) * 9);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (value <= x1) {
      const t = x1 === x0 ? 0 : (value - x0) / (x1 - x0);
      return Math.round(y0 + t * (y1 - y0));
    }
  }
  return 90;
}

export default function BenchmarkPanel() {
  const { ctx, activeId } = useFinancialContext();
  const persona = activeId ? getPersona(activeId) : undefined;

  const row = useMemo<BenchRow | undefined>(() => {
    if (!persona) return undefined;
    return (benchmark as { brackets: BenchRow[] }).brackets.find(
      (b) => b.income_bracket === persona.income_bracket && b.city_tier === persona.city_tier
    );
  }, [persona]);

  const userMonthly = useMemo<Record<string, number>>(() => {
    const totals: Record<string, number> = {};
    if (!ctx) return totals;
    for (const t of ctx.transactions) {
      if (t.amount < 0) totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
    }
    for (const k of Object.keys(totals)) totals[k] = totals[k] / BENCH_MONTHS;
    return totals;
  }, [ctx]);

  if (!persona || !row) {
    return (
      <div className="card">
        <p className="muted text-sm">Peer benchmark</p>
        <p className="mt-1 text-lg font-semibold">No peer data for this bracket</p>
        <p className="muted mt-1 text-sm">
          No benchmark available for this persona&apos;s income bracket / city tier.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="muted text-sm">Peer benchmark</p>
      <p className="mt-1 text-lg font-semibold">
        {persona.income_bracket} income · {persona.city_tier}
      </p>
      <p className="muted mt-1 text-sm">
        Your monthly spend vs peers in the same bracket (static reference data).
      </p>

      <div className="mt-4 grid gap-3">
        {row.categories.map((c) => {
          const value = userMonthly[c.category] || 0;
          const pct = estimatePercentile(value, c.percentiles);
          return (
            <div key={c.category}>
              <div className="flex justify-between text-sm">
                <span className="capitalize">{c.category}</span>
                <span className="muted">
                  {inr(value)}/mo · <strong style={{ color: "var(--text)" }}>{pct}th pct</strong>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full" style={{ background: "var(--bg-soft)" }}>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: pct >= 75 ? "var(--danger)" : pct >= 50 ? "var(--warn)" : "var(--accent-2)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
