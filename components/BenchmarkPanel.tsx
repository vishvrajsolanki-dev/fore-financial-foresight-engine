"use client";

import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { buildBenchmarkInsights } from "@/lib/ahead/insights";
import { getPersona } from "@/lib/data/personas";
import { formatMoney } from "@/lib/format/currency";

export default function BenchmarkPanel() {
  const { ctx, activeId, currency } = useFinancialContext();
  const persona = activeId ? getPersona(activeId) : undefined;
  const benchmark = ctx?.benchmark;
  const insights = ctx ? buildBenchmarkInsights(ctx, currency) : [];

  if (!persona) return null;

  if (!benchmark?.length) {
    return (
      <div className="card">
        <p className="face-kicker">Peer benchmark</p>
        <p className="mt-1 text-lg font-semibold">No peer data for this bracket</p>
        <p className="muted mt-1 text-sm">
          Load a persona on PAST first — benchmarks compare your category spend to peers in the same
          income bracket and city tier.
        </p>
      </div>
    );
  }

  const highSpend = insights.filter((i) => i.percentile >= 75);
  const summary =
    highSpend.length > 0
      ? `Focus areas: ${highSpend.map((i) => i.category).join(", ")} run high vs peers — trimming these frees the most savings headroom.`
      : "Your category mix is at or below peer medians — strong discipline relative to your income bracket.";

  return (
    <div className="card">
      <p className="face-kicker">Peer benchmark (modeled)</p>
      <p className="mt-1 text-lg font-semibold">
        {persona.income_bracket} · {persona.city_tier}
      </p>
      <p className="muted mt-1 text-sm">{summary}</p>
      <p className="muted mt-1 text-xs">
        Percentiles use authored peer tables for demos — not a live survey of real users.
      </p>

      <div className="mt-4 grid gap-4">
        {insights.map((row) => {
          const pct = row.percentile;
          return (
            <div key={row.category} className="benchmark-row">
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-medium capitalize">{row.category}</span>
                <span className="muted shrink-0">
                  {formatMoney(row.userValue, currency)}/mo ·{" "}
                  <strong style={{ color: "var(--text)" }}>{pct}th pct</strong>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full benchmark-track">
                <div
                  className="h-2 rounded-full benchmark-fill"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background:
                      pct >= 75 ? "var(--danger)" : pct >= 50 ? "var(--warn)" : "var(--accent-2)",
                  }}
                />
              </div>
              <p className="muted mt-1.5 text-xs leading-relaxed">{row.insight}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
