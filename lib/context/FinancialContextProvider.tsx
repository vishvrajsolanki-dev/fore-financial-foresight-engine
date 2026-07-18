// FORE — lib/context/FinancialContextProvider.tsx
// The shared data spine (CONTRACT-001) made reactive for the browser demo. All three faces read
// and write the SAME financial_context here, so PAST, DECIDE and AHEAD stay in sync — the "one
// system, not three screens" property. Rule (CONTRACT-001): no face displays a number without
// writing it back here first.
//
// Note on state location: CONTRACTS.md describes an in-memory server object; for a serverless
// Vercel demo with no DB, a single client-side context is the robust equivalent — it survives
// client navigation between the three tabs and updates every face reactively.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getPastData } from "@/lib/api/pastClient";
import { PERSONAS, getPersona, type PersonaSeed } from "@/lib/data/personas";
import type { FinancialContext } from "@/types/financialContext";

type DecideVerdict = NonNullable<FinancialContext["last_decide_verdict"]>;

interface FinancialContextValue {
  personas: PersonaSeed[];
  activeId: string | null;
  ctx: FinancialContext | null;
  pastLoading: boolean;
  pastError: string | null;
  selectPersona: (sessionId: string) => Promise<void>;
  setGoal: (targetAmount: number, targetDate: string) => void;
  applyDecideVerdict: (verdict: DecideVerdict) => void;
}

const Ctx = createContext<FinancialContextValue | null>(null);

function baseContext(seed: PersonaSeed): FinancialContext {
  return {
    session_id: seed.session_id,
    persona: seed.persona,
    monthly_income: seed.monthly_income,
    archetype: null,
    burn_rate: null,
    transactions: seed.transactions,
    goal: null,
    last_decide_verdict: null,
    benchmark: null,
  };
}

function computeGoal(
  targetAmount: number,
  targetDate: string,
  monthlyIncome: number,
  dailyAvg: number
): FinancialContext["goal"] {
  const today = new Date();
  const target = new Date(targetDate);
  const daysRemaining = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  // Edge case: target date in the past -> not on pace, no nonsensical negative projection.
  if (!Number.isFinite(daysRemaining) || daysRemaining <= 0) {
    return { target_amount: targetAmount, target_date: targetDate, on_pace: false, pace_gap_days: null };
  }
  const dailySurplus = monthlyIncome / 30 - dailyAvg; // what you can set aside each day
  const requiredPerDay = targetAmount / daysRemaining;
  if (dailySurplus <= 0) {
    // Can't save at the current burn rate — unreachable, gap not projectable.
    return { target_amount: targetAmount, target_date: targetDate, on_pace: false, pace_gap_days: null };
  }
  const daysToReach = targetAmount / dailySurplus;
  const paceGap = Math.round(daysToReach - daysRemaining); // >0 => behind, <=0 => on/ahead
  return {
    target_amount: targetAmount,
    target_date: targetDate,
    on_pace: dailySurplus >= requiredPerDay,
    pace_gap_days: paceGap,
  };
}

export function FinancialContextProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<FinancialContext | null>(null);
  const [pastLoading, setPastLoading] = useState(false);
  const [pastError, setPastError] = useState<string | null>(null);

  const selectPersona = useCallback(async (sessionId: string) => {
    const seed = getPersona(sessionId);
    if (!seed) return;
    const base = baseContext(seed);
    setActiveId(sessionId);
    setCtx(base);
    setPastError(null);
    setPastLoading(true);
    try {
      const past = await getPastData(seed.transactions, seed.monthly_income);
      setCtx((prev) =>
        prev && prev.session_id === sessionId
          ? { ...prev, archetype: past.archetype, burn_rate: past.burn_rate }
          : prev
      );
    } catch (err) {
      setPastError(err instanceof Error ? err.message : "Failed to load PAST data");
    } finally {
      setPastLoading(false);
    }
  }, []);

  const setGoal = useCallback((targetAmount: number, targetDate: string) => {
    setCtx((prev) => {
      if (!prev) return prev;
      const dailyAvg = prev.burn_rate?.daily_avg ?? 0;
      return { ...prev, goal: computeGoal(targetAmount, targetDate, prev.monthly_income, dailyAvg) };
    });
  }, []);

  const applyDecideVerdict = useCallback((verdict: DecideVerdict) => {
    // Writing the verdict back updates the shared spine: AHEAD re-reads the new zero-balance
    // date so the goal pace reflects the decision immediately (no stale "three screens").
    setCtx((prev) => {
      if (!prev) return prev;
      // Store only the CONTRACT-001 fields (drop any extras like `affordable` the API may add).
      const stored: DecideVerdict = {
        item: verdict.item,
        amount: verdict.amount,
        day_shift: verdict.day_shift,
        new_zero_balance_date: verdict.new_zero_balance_date,
      };
      const burn_rate = prev.burn_rate
        ? { ...prev.burn_rate, projected_zero_balance_date: verdict.new_zero_balance_date }
        : prev.burn_rate;
      return { ...prev, last_decide_verdict: stored, burn_rate };
    });
  }, []);

  const value = useMemo<FinancialContextValue>(
    () => ({
      personas: PERSONAS,
      activeId,
      ctx,
      pastLoading,
      pastError,
      selectPersona,
      setGoal,
      applyDecideVerdict,
    }),
    [activeId, ctx, pastLoading, pastError, selectPersona, setGoal, applyDecideVerdict]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinancialContext(): FinancialContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFinancialContext must be used within FinancialContextProvider");
  return v;
}
