// FORE — components/PastPanel.tsx
// Owner: TASK-002 (Drashti). Archetype label + radar chart (distances) + burn-rate + balance line.
// Data source: lib/api/pastClient.ts via the shared context — never a direct fetch here, so the
// PLACEHOLDER-A -> real swap stayed a one-file change.

"use client";

import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

import FaceIntro from "@/components/FaceIntro";
import { CardSkeleton, ChartSkeleton } from "@/components/LoadingSkeleton";
import { features } from "@/lib/features";
import { formatMoney } from "@/lib/format/currency";
import { archetypeCopy } from "@/lib/ml/archetypeCopy";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

function inr(n: number, currency: "INR" | "USD" | "EUR" = "INR"): string {
  return formatMoney(n, currency);
}

export default function PastPanel() {
  const { ctx, pastLoading, pastError, currency } = useFinancialContext();

  const radarData = useMemo(() => {
    if (!ctx?.archetype) return [];
    return Object.entries(ctx.archetype.distances).map(([label, distance]) => ({
      label: label.replace(" ", "\n"),
      closeness: Number((1 / (1 + distance)).toFixed(3)), // higher = closer match
    }));
  }, [ctx?.archetype]);

  const balanceSeries = useMemo(() => {
    if (!ctx?.transactions?.length) return [];
    const sorted = [...ctx.transactions].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const weekMap = new Map<string, { balance: number; iso: string }>();
    for (const t of sorted) {
      running += t.amount;
      const d = new Date(t.date + "T00:00:00Z");
      const day = d.getUTCDay();
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() - day);
      const iso = weekStart.toISOString().slice(0, 10);
      const key = iso.slice(5);
      weekMap.set(key, { balance: Math.round(running), iso });
    }
    return Array.from(weekMap.entries()).map(([date, { balance, iso }]) => ({
      date,
      balance,
      iso,
    }));
  }, [ctx?.transactions]);

  const projectedZeroMarker = useMemo(() => {
    if (!ctx?.burn_rate?.projected_zero_balance_date || !balanceSeries.length) return null;
    const target = ctx.burn_rate.projected_zero_balance_date;
    const targetTime = new Date(target + "T00:00:00Z").getTime();
    let nearest = balanceSeries[0];
    let minDist = Infinity;
    for (const pt of balanceSeries) {
      const dist = Math.abs(new Date(pt.iso + "T00:00:00Z").getTime() - targetTime);
      if (dist < minDist) {
        minDist = dist;
        nearest = pt;
      }
    }
    return { x: nearest.date, label: target };
  }, [ctx?.burn_rate?.projected_zero_balance_date, balanceSeries]);

  const balanceWindowLabel = useMemo(() => {
    if (!ctx?.transactions?.length) return "Running balance";
    const dates = ctx.transactions.map((t) => t.date).sort();
    return `Running balance · ${dates[0]} → ${dates[dates.length - 1]}`;
  }, [ctx?.transactions]);

  if (pastLoading) {
    return (
      <div className="grid gap-4">
        <FaceIntro
          face="PAST"
          title="Your spending, decoded"
          blurb="Archetype, burn-rate trend, and zero-balance projection from real transaction math."
        />
        {features.loadingSkeletons ? (
          <>
            <CardSkeleton lines={2} />
            <ChartSkeleton />
          </>
        ) : (
          <div className="card muted text-sm">Analysing spending profile…</div>
        )}
      </div>
    );
  }
  if (pastError) {
    return (
      <div className="grid gap-4">
        <FaceIntro
          face="PAST"
          title="Your spending, decoded"
          blurb="Archetype, burn-rate trend, and zero-balance projection from real transaction math."
        />
        <div className="card">
          <p className="font-medium" style={{ color: "var(--danger)" }}>
            Couldn&apos;t load PAST data
          </p>
          <p className="muted mt-1 text-sm">{pastError}</p>
          <p className="muted mt-2 text-sm">
            Is the ML service running? Set <code>ML_MODE=inline</code> on Vercel (no Render needed) or
            <code>RENDER_ML_BASE_URL</code> for an external Python service.
          </p>
        </div>
      </div>
    );
  }
  if (!ctx?.archetype || !ctx?.burn_rate) {
    return (
      <div className="grid gap-4">
        <FaceIntro
          face="PAST"
          title="Your spending, decoded"
          blurb="Archetype, burn-rate trend, and zero-balance projection from real transaction math."
        />
        <div className="card muted text-sm">
          No analysis yet — upload your bank CSV above. We&apos;ll assign your archetype from the
          spend mix (RupeeIQ-style), not from a persona picker.
        </div>
      </div>
    );
  }

  const { archetype, burn_rate } = ctx;
  const slopePositive = burn_rate.trend_slope >= 0;
  const copy = archetypeCopy(archetype.label);

  return (
    <div className="grid gap-4">
      <FaceIntro
        face="PAST"
        title="Your spending, decoded"
        blurb="Archetype assigned from spending patterns, burn-rate trend, and zero-balance runway."
      />
      <div className="card">
        <p className="muted text-sm">Assigned spending archetype</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold">{archetype.label}</span>
          <span className="pill">assigned · Euclidean nearest of 5</span>
        </div>
        <p className="mt-3 text-sm">{copy.blurb}</p>
        <p className="muted mt-2 text-sm">
          <span className="font-semibold" style={{ color: "var(--text)" }}>
            Tip:{" "}
          </span>
          {copy.tip}
        </p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 1]} />
              <Radar
                dataKey="closeness"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.35}
                isAnimationActive={features.chartAnimations}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="muted text-xs">Closeness = 1 / (1 + Euclidean distance). Higher is a closer match.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="muted text-sm">Daily burn (consumption)</p>
          <p className="text-2xl font-bold mt-1">{inr(burn_rate.daily_avg, currency)}/day</p>
        </div>
        <div className="card">
          <p className="muted text-sm">Balance trend</p>
          <p
            className="text-2xl font-bold mt-1"
            style={{ color: slopePositive ? "var(--accent-2)" : "var(--danger)" }}
          >
            {slopePositive ? "▲" : "▼"} {inr(Math.abs(burn_rate.trend_slope), currency)}/day
          </p>
          <p className="muted text-xs mt-1">
            {slopePositive ? "Net accumulating" : "Net depleting"} (straight-line trend)
          </p>
        </div>
        <div className="card">
          <p className="muted text-sm">Projected zero-balance</p>
          <p className="text-2xl font-bold mt-1">{burn_rate.projected_zero_balance_date}</p>
          <p className="muted text-xs mt-1">
            If income stopped at today&apos;s spend rate
            {typeof burn_rate.runway_days_if_income_stopped === "number"
              ? ` · ${burn_rate.runway_days_if_income_stopped} day(s) of runway`
              : ""}
          </p>
        </div>
      </div>

      <div className="card">
        <p className="muted text-sm mb-3">{balanceWindowLabel}</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={balanceSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} minTickGap={24} />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
              {projectedZeroMarker && (
                <ReferenceLine
                  x={projectedZeroMarker.x}
                  stroke="var(--accent-2)"
                  strokeDasharray="6 3"
                  label={{
                    value: `Projected ${currency === "INR" ? "₹" : currency === "EUR" ? "€" : "$"}0 · ${projectedZeroMarker.label}`,
                    position: "insideTopRight",
                    fill: "var(--muted)",
                    fontSize: 10,
                  }}
                />
              )}
              <Tooltip
                formatter={(v: number) => inr(v, currency)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={features.chartAnimations}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
