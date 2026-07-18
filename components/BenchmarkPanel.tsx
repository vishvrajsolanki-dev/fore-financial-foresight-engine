// FORE — components/BenchmarkPanel.tsx
// Owner: TASK-006 (Drashti). Static peer-benchmark percentile panel, sourced from
// data/benchmark.json (CONTRACT-005) for the active persona's income bracket / city tier.
// Percentiles are computed here (piecewise across p25/p50/p75/p90) and written back into
// financial_context.benchmark per CONTRACT-001's write-back rule.

"use client";

import { useEffect, useMemo } from "react";
import benchmarkData from "@/data/benchmark.json";
import type { BenchmarkRow } from "@/types/financialContext";
import { useFinancialContext } from "@/lib/context/financialContext";

const BRACKETS = benchmarkData as BenchmarkRow[];

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  shopping: "Shopping",
  bills: "Bills",
  entertainment: "Entertainment",
  savings: "Savings",
};

// Piecewise-linear percentile placement across the four anchors.
function toPercentile(
  value: number,
  p: { p25: number; p50: number; p75: number; p90: number }
): number {
  const anchors: [number, number][] = [
    [p.p25, 25],
    [p.p50, 50],
    [p.p75, 75],
    [p.p90, 90],
  ];
  if (value <= anchors[0][0]) {
    return Math.max(1, Math.round((value / anchors[0][0]) * 25));
  }
  for (let i = 1; i < anchors.length; i++) {
    const [prevV, prevP] = anchors[i - 1];
    const [curV, curP] = anchors[i];
    if (value <= curV) {
      return Math.round(
        prevP + ((value - prevV) / (curV - prevV)) * (curP - prevP)
      );
    }
  }
  // Beyond p90: taper toward 99.
  const [p90v] = anchors[3];
  return Math.min(99, Math.round(90 + ((value - p90v) / p90v) * 9));
}

export default function BenchmarkPanel() {
  const { ctx, activePersona, update } = useFinancialContext();

  const rows = useMemo(() => {
    if (!activePersona || ctx.transactions.length === 0) return null;
    const bracket = BRACKETS.find(
      (b) =>
        b.income_bracket === activePersona.income_bracket &&
        b.city_tier === activePersona.city_tier
    );
    if (!bracket) return null;

    // Monthly average spend per category over the 90-day window.
    const totals = new Map<string, number>();
    for (const t of ctx.transactions) {
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return bracket.categories
      .map((c) => {
        const monthly = Math.round((totals.get(c.category) ?? 0) / 3);
        return {
          category: c.category,
          user_value: monthly,
          percentile: toPercentile(monthly, c.percentiles),
          p50: c.percentiles.p50,
        };
      })
      .sort((a, b) => b.percentile - a.percentile);
  }, [activePersona, ctx.transactions]);

  // Write the computed benchmark back into financial_context (CONTRACT-001 rule).
  useEffect(() => {
    if (!rows) return;
    update({
      benchmark: rows.map(({ category, user_value, percentile }) => ({
        category,
        user_value,
        percentile,
      })),
    });
  }, [rows, update]);

  if (!activePersona) {
    return (
      <section className="rounded-lg border border-dashed border-slate-700 p-5 text-sm text-slate-400">
        Select a persona to compare their spending against peers.
      </section>
    );
  }
  if (!rows) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
        No benchmark data for bracket {activePersona.income_bracket} /{" "}
        {activePersona.city_tier}.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold">Peer benchmark</h2>
      <p className="mt-1 text-xs text-slate-500">
        Monthly spend vs peers in the {activePersona.income_bracket} bracket,{" "}
        {activePersona.city_tier} — static dataset, computed once.
      </p>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          // For savings a high percentile is good; for spend categories it means overspending.
          const concern =
            row.category === "savings" ? 100 - row.percentile : row.percentile;
          const tone =
            concern >= 75
              ? { text: "text-rose-300", bar: "bg-rose-400" }
              : concern >= 50
                ? { text: "text-amber-300", bar: "bg-amber-400" }
                : { text: "text-emerald-300", bar: "bg-emerald-400" };
          return (
            <li key={row.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {CATEGORY_LABELS[row.category] ?? row.category}
                </span>
                <span className="text-slate-400">
                  ₹{row.user_value.toLocaleString("en-IN")}/mo ·{" "}
                  <span className={tone.text}>p{row.percentile}</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-800">
                <div
                  className={"h-2 rounded-full " + tone.bar}
                  style={{ width: `${row.percentile}%` }}
                />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                peer median ₹{row.p50.toLocaleString("en-IN")}/mo — higher than{" "}
                {row.percentile}% of peers
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
