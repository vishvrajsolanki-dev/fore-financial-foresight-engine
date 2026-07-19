import type { FinancialContext } from "@/types/financialContext";

/** Extra daily burn implied by a one-time purchase (spread over 30 days). */
export function purchaseDailyBurn(amount: number): number {
  return Math.abs(amount) / 30;
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
