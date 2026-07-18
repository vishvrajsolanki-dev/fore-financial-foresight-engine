// FORE — components/GoalPanel.tsx
// Owner: TASK-006 (Drashti). Goal input form (target amount + date) + pace verdict display.
// Pace calc: goal.target_amount / days-remaining vs the daily surplus implied by
// burn_rate.daily_avg — simple arithmetic only, no new model, no new endpoint.
// Edge case: target_date in the past -> validation message, not a nonsensical negative.
// Reads financial_context on every render, so a DECIDE verdict (last_decide_verdict /
// updated burn_rate) reprices the pace verdict immediately — never a stale display.

"use client";

import { useState, type FormEvent } from "react";
import { useFinancialContext } from "@/lib/context/financialContext";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function GoalPanel() {
  const { ctx, update } = useFinancialContext();
  const [amountInput, setAmountInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const targetAmount = Number(amountInput);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setValidationError("Target amount must be a positive number.");
      return;
    }
    if (!dateInput) {
      setValidationError("Pick a target date.");
      return;
    }
    const daysRemaining = Math.ceil(
      (new Date(dateInput).getTime() - Date.now()) / MS_PER_DAY
    );
    if (daysRemaining <= 0) {
      setValidationError(
        "Target date is in the past — pick a future date to compute a pace."
      );
      return;
    }
    if (!ctx.burn_rate) {
      setValidationError("Select a persona first so a burn rate exists.");
      return;
    }

    const requiredPerDay = targetAmount / daysRemaining;
    const dailySurplus = ctx.monthly_income / 30 - ctx.burn_rate.daily_avg;
    const onPace = dailySurplus >= requiredPerDay;
    // How many extra days past the target date the goal needs at the current surplus.
    const paceGapDays =
      dailySurplus > 0
        ? Math.ceil(targetAmount / dailySurplus) - daysRemaining
        : null;

    update({
      goal: {
        target_amount: targetAmount,
        target_date: dateInput,
        on_pace: onPace,
        pace_gap_days: onPace ? 0 : paceGapDays,
      },
    });
  }

  const goal = ctx.goal;
  const dailySurplus = ctx.burn_rate
    ? ctx.monthly_income / 30 - ctx.burn_rate.daily_avg
    : null;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold">Goal pace</h2>
      <p className="mt-1 text-xs text-slate-500">
        Save a target amount by a date — checked against your current burn
        rate.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Target amount (₹)
          <input
            type="number"
            min="1"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="50000"
            className="w-36 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Target date
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-44 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          Check pace
        </button>
      </form>

      {validationError ? (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          {validationError}
        </p>
      ) : null}

      {goal && ctx.burn_rate ? (
        <div
          className={
            "mt-4 rounded-md border px-4 py-3 " +
            (goal.on_pace
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-rose-500/40 bg-rose-500/10")
          }
        >
          <p className="text-sm font-semibold">
            {goal.on_pace ? "✅ On pace" : "⚠️ Off pace"} — ₹
            {goal.target_amount.toLocaleString("en-IN")} by {goal.target_date}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Needs ₹
            {Math.ceil(
              goal.target_amount /
                Math.max(
                  1,
                  Math.ceil(
                    (new Date(goal.target_date).getTime() - Date.now()) /
                      MS_PER_DAY
                  )
                )
            ).toLocaleString("en-IN")}
            /day saved · current daily surplus ₹
            {Math.round(dailySurplus ?? 0).toLocaleString("en-IN")} (income ÷ 30
            − burn rate ₹
            {ctx.burn_rate.daily_avg.toLocaleString("en-IN")}/day)
          </p>
          {!goal.on_pace ? (
            <p className="mt-1 text-xs text-rose-300">
              {goal.pace_gap_days !== null
                ? `At the current surplus you'd reach it ~${goal.pace_gap_days} days late.`
                : "Current spending leaves no daily surplus — the goal isn't reachable at this burn rate."}
            </p>
          ) : null}
        </div>
      ) : null}

      {ctx.last_decide_verdict ? (
        <p className="mt-3 text-xs text-sky-300">
          Reflects latest DECIDE verdict: {ctx.last_decide_verdict.item} (₹
          {ctx.last_decide_verdict.amount.toLocaleString("en-IN")}) shifted
          zero-balance to {ctx.last_decide_verdict.new_zero_balance_date}.
        </p>
      ) : null}
    </section>
  );
}
