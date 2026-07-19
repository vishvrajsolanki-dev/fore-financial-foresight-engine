// FORE — components/GoalPanel.tsx
// Owner: TASK-006 (Drashti). Goal input form (target amount + date) + pace verdict display.
// Pace calc lives in the shared context (setGoal). Re-reads financial_context after every DECIDE
// verdict — the last_decide_verdict banner is what makes this "one system", not three screens.

"use client";

import { useState } from "react";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";
import { computeGoal, purchaseDailyBurn } from "@/lib/ahead/goalMath";
import { features } from "@/lib/features";
import { buildGoalInsight } from "@/lib/ahead/insights";
import { exportAheadSummaryPng } from "@/lib/export/aheadSummary";
import { formatMoney } from "@/lib/format/currency";

function inr(n: number, currency: "INR" | "USD" | "EUR" = "INR"): string {
  return formatMoney(n, currency);
}

export default function GoalPanel() {
  const { ctx, setGoal, currency } = useFinancialContext();
  const [amount, setAmount] = useState("50000");
  const [date, setDate] = useState("2026-12-31");
  const [formError, setFormError] = useState<string | null>(null);

  if (!ctx) return null;
  const goal = ctx.goal;
  const verdict = ctx.last_decide_verdict;
  const burnReady = ctx.burn_rate != null;

  const pastDate = new Date(date) <= new Date();

  const goalImpactDays =
    goal && verdict && ctx.burn_rate && goal.pace_gap_days != null
      ? (() => {
          const baseline = computeGoal(
            goal.target_amount,
            goal.target_date,
            ctx.monthly_income,
            ctx.burn_rate.daily_avg
          );
          if (baseline?.pace_gap_days == null) return null;
          return goal.pace_gap_days - baseline.pace_gap_days;
        })()
      : null;

  const insight = buildGoalInsight(ctx, currency);

  return (
    <div className="card">
      <p className="muted text-sm">Savings goal</p>
      <p className="mt-1 text-lg font-semibold">Set a target, see if you&apos;re on pace</p>

      {!burnReady && (
        <p className="muted mt-3 text-sm">
          Open PAST first (or wait for your spending profile to load) — goal pace needs your
          burn-rate trend.
        </p>
      )}

      <form
        className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError(null);
          if (!burnReady) {
            setFormError("Burn rate isn't ready yet — open PAST or wait a moment.");
            return;
          }
          const amt = Number(amount);
          if (!Number.isFinite(amt) || amt <= 0) {
            setFormError("Target amount must be a positive number.");
            return;
          }
          if (pastDate) {
            setFormError("Target date is in the past — pick a future date.");
            return;
          }
          setGoal(amt, date);
        }}
      >
        <label className="grid gap-1">
          <span className="muted text-xs">Target amount (₹)</span>
          <input
            className="input"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFormError(null);
            }}
          />
        </label>
        <label className="grid gap-1">
          <span className="muted text-xs">Target date</span>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setFormError(null);
            }}
          />
        </label>
        <button className="btn" type="submit" disabled={!burnReady}>
          Check pace
        </button>
      </form>

      {(formError || pastDate) && (
        <p className="mt-3 text-sm" style={{ color: "var(--warn)" }}>
          {formError ?? "Target date is in the past — pick a future date."}
        </p>
      )}

      {goal && !pastDate && insight && (
        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`pill ${goal.on_pace ? "pill-success" : "pill-warn"}`}>
              {goal.on_pace ? "On pace" : "Behind pace"}
            </span>
            <span className="muted text-sm">
              Target {inr(goal.target_amount, currency)} by {goal.target_date}
            </span>
          </div>

          <div className="insight-box">
            <p className="font-semibold text-sm">{insight.headline}</p>
            <p className="muted mt-1 text-sm leading-relaxed">{insight.detail}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {insight.stats.map((s) => (
              <div key={s.label} className="stat-tile">
                <p className="muted text-xs">{s.label}</p>
                <p className="mt-0.5 font-semibold text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {verdict && goalImpactDays != null && goalImpactDays > 0 && (
            <p className="text-sm" style={{ color: "var(--warn)" }}>
              After {verdict.item} ({inr(verdict.amount, currency)}), you&apos;re about {goalImpactDays}{" "}
              day{goalImpactDays === 1 ? "" : "s"} further from this goal — pace above includes ≈
              {inr(purchaseDailyBurn(verdict.amount) * 30, currency)}/mo extra burn.
            </p>
          )}
        </div>
      )}

      {goal && !pastDate && !insight && (
        <div className="mt-4 grid gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="pill"
              style={
                goal.on_pace
                  ? { color: "var(--accent-2)", borderColor: "rgba(46,125,91,.35)", background: "rgba(46,125,91,.1)" }
                  : { color: "var(--danger)", borderColor: "rgba(201,58,43,.35)", background: "rgba(201,58,43,.08)" }
              }
            >
              {goal.on_pace ? "On pace" : "Behind pace"}
            </span>
            <span className="muted text-sm">
              Target {inr(goal.target_amount, currency)} by {goal.target_date}
            </span>
          </div>
          <p className="muted text-sm">
            {goal.pace_gap_days === null
              ? "At your current burn rate you aren't saving anything — this goal isn't reachable without cutting spend."
              : goal.on_pace
                ? `You're on track — about ${Math.abs(goal.pace_gap_days)} day(s) of buffer at your current savings rate.`
                : `You're roughly ${goal.pace_gap_days} day(s) behind at your current savings rate.`}
          </p>
        </div>
      )}

      {verdict && (
        <div
          className="mt-4 rounded-xl p-3"
          style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm">
            <strong>Recent DECIDE verdict:</strong> {verdict.item} ({inr(verdict.amount, currency)}) shifts your
            zero-balance date to <strong>{verdict.new_zero_balance_date}</strong> ({verdict.day_shift}{" "}
            day{Math.abs(verdict.day_shift) === 1 ? "" : "s"}).
          </p>
          <p className="muted text-xs mt-1">This panel reflects the same financial context DECIDE just updated.</p>
        </div>
      )}

      {features.exportAhead && ctx && (
        <button
          type="button"
          className="btn-ghost mt-4 text-sm"
          onClick={() => exportAheadSummaryPng(ctx, ctx.persona)}
        >
          Export AHEAD summary (PNG)
        </button>
      )}
    </div>
  );
}
