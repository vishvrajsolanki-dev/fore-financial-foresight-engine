import type { FinancialContext } from "@/types/financialContext";
import { formatMoney } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/format/currency";

export interface GoalInsight {
  headline: string;
  detail: string;
  stats: { label: string; value: string }[];
}

export function buildGoalInsight(
  ctx: FinancialContext,
  currency: CurrencyCode = "INR"
): GoalInsight | null {
  const goal = ctx.goal;
  const burn = ctx.burn_rate;
  if (!goal || !burn) return null;

  const today = new Date();
  const target = new Date(goal.target_date);
  const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (daysRemaining <= 0) return null;

  const dailySurplus = ctx.monthly_income / 30 - burn.daily_avg;
  const requiredPerDay = goal.target_amount / daysRemaining;
  const fmt = (n: number) => formatMoney(n, currency);

  const stats = [
    { label: "Days to target", value: `${daysRemaining}` },
    { label: "Need to save/day", value: `${fmt(requiredPerDay)}` },
    { label: "Current surplus/day", value: `${fmt(Math.max(0, dailySurplus))}` },
    { label: "Daily burn", value: `${fmt(burn.daily_avg)}` },
  ];

  if (dailySurplus <= 0) {
    return {
      headline: "Goal not reachable at current spend",
      detail: `You're running a daily deficit of ${fmt(Math.abs(dailySurplus))}. Cut consumption or increase income before ${goal.target_date} — saving ${fmt(goal.target_amount)} requires ${fmt(requiredPerDay)}/day you don't have today.`,
      stats,
    };
  }

  if (goal.on_pace) {
    const buffer = goal.pace_gap_days ?? 0;
    return {
      headline: "On pace for your goal",
      detail: `Saving ${fmt(dailySurplus)}/day exceeds the ${fmt(requiredPerDay)}/day needed for ${fmt(goal.target_amount)} by ${goal.target_date}. You have ~${Math.abs(buffer)} day(s) of buffer at this rate.${ctx.last_decide_verdict ? ` Latest DECIDE purchase (${ctx.last_decide_verdict.item}) is already reflected.` : ""}`,
      stats,
    };
  }

  const gap = goal.pace_gap_days ?? 0;
  const extraPerDay = requiredPerDay - dailySurplus;
  return {
    headline: `${gap} day(s) behind pace`,
    detail: `You need ${fmt(requiredPerDay)}/day but only have ${fmt(dailySurplus)}/day surplus. Trim ~${fmt(extraPerDay)}/day from discretionary spend (dining, shopping, subscriptions) or push the target date forward by ~${gap} days.`,
    stats,
  };
}

export interface BenchmarkInsight {
  category: string;
  userValue: number;
  percentile: number;
  insight: string;
}

export function buildBenchmarkInsights(
  ctx: FinancialContext,
  currency: CurrencyCode = "INR"
): BenchmarkInsight[] {
  if (!ctx.benchmark?.length) return [];

  return ctx.benchmark.map((row) => {
    const fmt = formatMoney(row.user_value, currency);
    let insight: string;
    if (row.percentile >= 75) {
      insight = `High vs peers — you're in the top quartile for ${row.category}. Consider capping this category 15–20% to free room for savings.`;
    } else if (row.percentile >= 50) {
      insight = `Above median for ${row.category} (${fmt}/mo). Room to trim without drastic lifestyle changes.`;
    } else if (row.percentile >= 25) {
      insight = `Below median — disciplined on ${row.category} (${fmt}/mo). Good headroom vs peers in your bracket.`;
    } else {
      insight = `Well below peers on ${row.category} (${fmt}/mo) — one of your strongest categories relative to income bracket.`;
    }
    return {
      category: row.category,
      userValue: row.user_value,
      percentile: row.percentile,
      insight,
    };
  });
}
