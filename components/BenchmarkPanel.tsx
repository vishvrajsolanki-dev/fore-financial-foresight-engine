// FORE — components/BenchmarkPanel.tsx
// Owner: TASK-006 (Drashti). Reads peer-benchmark percentiles from financial_context (CONTRACT-001).

"use client";

import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { getPersona } from "@/lib/data/personas";

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export default function BenchmarkPanel() {
  const { ctx, activeId } = useFinancialContext();
  const persona = activeId ? getPersona(activeId) : undefined;
  const benchmark = ctx?.benchmark;

  if (!persona) return null;

  if (!benchmark?.length) {
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
        {benchmark.map((row) => {
          const pct = row.percentile;
          return (
            <div key={row.category}>
              <div className="flex justify-between text-sm">
                <span className="capitalize">{row.category}</span>
                <span className="muted">
                  {inr(row.user_value)}/mo ·{" "}
                  <strong style={{ color: "var(--text)" }}>{pct}th pct</strong>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full" style={{ background: "var(--bg-soft)" }}>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background:
                      pct >= 75 ? "var(--danger)" : pct >= 50 ? "var(--warn)" : "var(--accent-2)",
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
