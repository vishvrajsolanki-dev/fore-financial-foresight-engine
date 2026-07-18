// FORE — lib/context/FinancialContextProvider.tsx
// The shared data spine (CONTRACT-001) made reactive for the browser demo. All three faces read
// and write the SAME financial_context here, so PAST, DECIDE and AHEAD stay in sync — the "one
// system, not three screens" property. Rule (CONTRACT-001): no face displays a number without
// writing it back here first.

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
import { computeBenchmark } from "@/lib/benchmark/computeBenchmark";
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

/** Amortize a one-time purchase over 30 days as extra daily burn for goal-pace math. */
export function purchaseDailyBurn(amount: number): number {
  return amount / 30;
}

export function computeGoal(
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
  if (!Number.isFinite(daysRemaining) || daysRemaining <= 0) {
    return { target_amount: targetAmount, target_date: targetDate, on_pace: false, pace_gap_days: null };
  }
  const dailySurplus = monthlyIncome / 30 - dailyAvg;
  const requiredPerDay = targetAmount / daysRemaining;
  if (dailySurplus <= 0) {
    return { target_amount: targetAmount, target_date: targetDate, on_pace: false, pace_gap_days: null };
  }
  const daysToReach = targetAmount / dailySurplus;
  const paceGap = Math.round(daysToReach - daysRemaining);
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
      const benchmark = computeBenchmark(
        seed.transactions,
        seed.income_bracket,
        seed.city_tier
      );
      setCtx((prev) =>
        prev && prev.session_id === sessionId
          ? {
              ...prev,
              archetype: past.archetype,
              burn_rate: past.burn_rate,
              benchmark,
            }
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
    setCtx((prev) => {
      if (!prev) return prev;
      const stored: DecideVerdict = {
        item: verdict.item,
        amount: verdict.amount,
        day_shift: verdict.day_shift,
        new_zero_balance_date: verdict.new_zero_balance_date,
      };
      const burn_rate = prev.burn_rate
        ? { ...prev.burn_rate, projected_zero_balance_date: verdict.new_zero_balance_date }
        : prev.burn_rate;

      // Recompute goal pace with the hypothetical purchase amortized as extra daily burn.
      let goal = prev.goal;
      if (goal && prev.burn_rate) {
        const adjustedDailyAvg = prev.burn_rate.daily_avg + purchaseDailyBurn(verdict.amount);
        goal = computeGoal(
          goal.target_amount,
          goal.target_date,
          prev.monthly_income,
          adjustedDailyAvg
        );
      }

      return { ...prev, last_decide_verdict: stored, burn_rate, goal };
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
