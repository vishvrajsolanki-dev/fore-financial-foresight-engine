// FORE — components/PastPanel.tsx
// Owner: TASK-002 (Drashti). Archetype label + radar chart (distances) + burn-rate line (Recharts).
// Data source: archetype/burn-rate arrive via financial_context, populated exclusively through
// lib/api/pastClient.ts — never a direct fetch here, so the PLACEHOLDER-A -> real swap at
// Checkpoint-1 stays a one-file change.
// Edge case: no persona selected -> prompt state, must not crash.

"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinancialContext } from "@/lib/context/financialContext";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function PastPanel() {
  const { ctx, activePersona } = useFinancialContext();

  // Daily spend series derived from the persona's transactions (display only — the burn-rate
  // numbers themselves come from financial_context, per CONTRACT-001's write-back rule).
  const dailySeries = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const t of ctx.transactions) {
      byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, spend]) => ({ date: date.slice(5), spend }));
  }, [ctx.transactions]);

  if (!activePersona) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 p-8 text-center">
        <h1 className="text-2xl font-bold">PAST — your spending, decoded</h1>
        <p className="mt-3 max-w-md text-sm text-slate-400">
          Select a demo persona from the top-right to see their spending
          archetype, burn-rate trend, and zero-balance projection.
        </p>
      </div>
    );
  }

  const radarData = ctx.archetype
    ? Object.entries(ctx.archetype.distances).map(([archetype, distance]) => ({
        archetype,
        // Invert distance for the radar so "closer to this archetype" reads as a larger area.
        closeness: Number((1 / Math.max(distance, 0.001)).toFixed(3)),
        distance,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PAST</h1>
        <p className="mt-1 text-sm text-slate-400">
          {activePersona.display_name} · income ₹
          {ctx.monthly_income.toLocaleString("en-IN")}/mo ·{" "}
          {ctx.transactions.length} transactions over 90 days
        </p>
      </div>

      {ctx.archetype && ctx.burn_rate ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Spending archetype"
              value={ctx.archetype.label}
              hint="Euclidean distance to 5 fixed centroids"
            />
            <StatCard
              label="Daily burn rate"
              value={`₹${ctx.burn_rate.daily_avg.toLocaleString("en-IN")}/day`}
              hint={
                ctx.burn_rate.trend_slope <= 0
                  ? `trending down ${Math.abs(ctx.burn_rate.trend_slope)}/day`
                  : `trending up ${ctx.burn_rate.trend_slope}/day`
              }
            />
            <StatCard
              label="Projected zero balance"
              value={ctx.burn_rate.projected_zero_balance_date}
              hint="Straight-line trend, not a forecast"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-300">
                Archetype closeness
              </h2>
              <p className="text-xs text-slate-500">
                Larger = closer to that archetype&apos;s centroid
              </p>
              <div className="mt-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                      dataKey="archetype"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar
                      name="closeness"
                      dataKey="closeness"
                      stroke="#34d399"
                      fill="#34d399"
                      fillOpacity={0.35}
                    />
                    <Tooltip
                      formatter={(_v, _n, entry) => [
                        `distance ${(entry?.payload as { distance: number }).distance}`,
                        (entry?.payload as { archetype: string }).archetype,
                      ]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-300">
                Daily spend (last 90 days)
              </h2>
              <p className="text-xs text-slate-500">
                Burn rate ₹{ctx.burn_rate.daily_avg.toLocaleString("en-IN")}
                /day avg
              </p>
              <div className="mt-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySeries}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      interval={13}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "spend"]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="spend"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">Analyzing spending history…</p>
      )}
    </div>
  );
}
