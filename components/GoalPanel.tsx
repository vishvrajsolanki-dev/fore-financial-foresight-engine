// FORE — components/GoalPanel.tsx
// Owner: TASK-006 (Drashti). Goal input form (target amount + date) + pace verdict display.
// Pace calc lives in the shared context (setGoal). Re-reads financial_context after every DECIDE
// verdict — the last_decide_verdict banner is what makes this "one system", not three screens.

"use client";

import { useState } from "react";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export default function GoalPanel() {
  const { ctx, setGoal } = useFinancialContext();
  const [amount, setAmount] = useState("50000");
  const [date, setDate] = useState("2026-12-31");
  const [formError, setFormError] = useState<string | null>(null);

  if (!ctx) return null;
  const goal = ctx.goal;
  const verdict = ctx.last_decide_verdict;
  const burnReady = ctx.burn_rate != null;

  const pastDate = new Date(date) <= new Date();

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

      {goal && !pastDate && (
        <div className="mt-4 grid gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="pill"
              style={
                goal.on_pace
                  ? { color: "var(--accent-2)", borderColor: "rgba(52,211,153,.4)", background: "rgba(52,211,153,.12)" }
                  : { color: "var(--danger)", borderColor: "rgba(248,113,113,.4)", background: "rgba(248,113,113,.12)" }
              }
            >
              {goal.on_pace ? "On pace" : "Behind pace"}
            </span>
            <span className="muted text-sm">
              Target {inr(goal.target_amount)} by {goal.target_date}
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
            <strong>Recent DECIDE verdict:</strong> {verdict.item} ({inr(verdict.amount)}) shifts your
            zero-balance date to <strong>{verdict.new_zero_balance_date}</strong> ({verdict.day_shift}{" "}
            day{Math.abs(verdict.day_shift) === 1 ? "" : "s"}).
          </p>
          <p className="muted text-xs mt-1">This panel reflects the same financial context DECIDE just updated.</p>
        </div>
      )}
    </div>
  );
}
