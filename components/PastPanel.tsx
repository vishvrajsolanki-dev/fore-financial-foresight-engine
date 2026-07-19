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

function money(n: number, currency: "INR" | "USD" | "EUR" = "INR"): string {
  return formatMoney(n, currency);
}

export default function PastPanel() {
  const { ctx, pastLoading, pastError, currency } = useFinancialContext();

  const radarData = useMemo(() => {
    if (!ctx?.archetype) return [];
    return Object.entries(ctx.archetype.distances).map(([label, distance]) => ({
      label: label.replace(" ", "\n"),
      closeness: Number((1 / (1 + distance)).toFixed(3)),
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
      weekMap.set(iso.slice(5), { balance: Math.round(running), iso });
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
          blurb="Runway first — then the archetype assigned from your spend mix."
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
          blurb="Runway first — then the archetype assigned from your spend mix."
        />
        <div className="card">
          <p className="font-medium" style={{ color: "var(--danger)" }}>
            Couldn&apos;t load PAST data
          </p>
          <p className="muted mt-1 text-sm">{pastError}</p>
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
          blurb="Upload a statement above — we assign your archetype from the spend mix."
        />
        <div className="card muted text-sm">
          No analysis yet. Drop your bank CSV to get a runway date and an assigned profile.
        </div>
      </div>
    );
  }

  const { archetype, burn_rate } = ctx;
  const slopePositive = burn_rate.trend_slope >= 0;
  const copy = archetypeCopy(archetype.label);
  const runway = burn_rate.runway_days_if_income_stopped ?? 0;
  const sym = currency === "INR" ? "₹" : currency === "EUR" ? "€" : "$";

  return (
    <div className="grid gap-5">
      <FaceIntro
        face="PAST"
        title="Your spending, decoded"
        blurb="Archetype assigned from spending patterns — runway from real burn math."
      />

      {/* Hero: runway / zero date leads */}
      <section className="hero-stat rise-in" aria-labelledby="runway-heading">
        <p className="face-kicker" id="runway-heading">
          If income stopped
        </p>
        <p className="hero-stat-value mt-2">{burn_rate.projected_zero_balance_date}</p>
        <p className="mt-2 text-sm sm:text-base">
          <span className="tabular font-semibold">{runway}</span> day
          {runway === 1 ? "" : "s"} of runway at{" "}
          <span className="tabular font-semibold">{money(burn_rate.daily_avg, currency)}</span>
          /day spend
        </p>
        <p className="muted mt-2 text-xs max-w-xl">
          Straight-line balance trend: {slopePositive ? "net accumulating" : "net depleting"} by{" "}
          {money(Math.abs(burn_rate.trend_slope), currency)}/day — not a forecast accuracy claim.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <p className="muted text-sm">Assigned spending archetype</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <h2 className="display text-3xl">{archetype.label}</h2>
            <span className="pill">Euclidean nearest of 5</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{copy.blurb}</p>
          <p className="muted mt-2 text-sm">
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              Tip:{" "}
            </span>
            {copy.tip}
          </p>
        </div>

        <div
          className="card"
          role="img"
          aria-label={`Archetype closeness radar. Nearest: ${archetype.label}.`}
        >
          <p className="muted text-sm mb-2">Closeness to each centroid</p>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 1]} />
                <Radar
                  dataKey="closeness"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.32}
                  isAnimationActive={features.chartAnimations}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted text-xs">Higher = closer match (1 / (1 + distance)).</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="stat-tile">
          <p className="muted text-xs uppercase tracking-wide font-semibold">Daily burn</p>
          <p className="display text-2xl mt-1 tabular">{money(burn_rate.daily_avg, currency)}/day</p>
        </div>
        <div className="stat-tile">
          <p className="muted text-xs uppercase tracking-wide font-semibold">Balance trend</p>
          <p
            className="display text-2xl mt-1 tabular"
            style={{ color: slopePositive ? "var(--positive)" : "var(--negative)" }}
          >
            {slopePositive ? "+" : "−"}
            {money(Math.abs(burn_rate.trend_slope), currency)}/day
          </p>
        </div>
      </div>

      <div className="card" role="img" aria-label={balanceWindowLabel}>
        <p className="muted text-sm mb-3">{balanceWindowLabel}</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={balanceSeries} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
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
                    value: `Projected ${sym}0 · ${projectedZeroMarker.label}`,
                    position: "insideTopRight",
                    fill: "var(--muted)",
                    fontSize: 10,
                  }}
                />
              )}
              <Tooltip
                formatter={(v: number) => money(v, currency)}
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
                strokeWidth={2.25}
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
