import type { FinancialContext } from "@/types/financialContext";
import { buildBenchmarkInsights, buildGoalInsight } from "@/lib/ahead/insights";
import type { CurrencyCode } from "@/lib/format/currency";
import { formatMoney } from "@/lib/format/currency";

export type WeeklyBriefSection = {
  id: string;
  title: string;
  body: string;
};

export type WeeklyBrief = {
  title: string;
  generatedAt: string;
  periodLabel: string;
  sections: WeeklyBriefSection[];
  links: { label: string; href: string }[];
};

/** Build an I2-style weekly brief from existing spine data — no ML recompute. */
export function buildWeeklyBrief(
  ctx: FinancialContext,
  currency: CurrencyCode = "INR"
): WeeklyBrief {
  const generatedAt = new Date().toISOString();
  const sections: WeeklyBriefSection[] = [];

  const spend = ctx.transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const inflow = ctx.transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  sections.push({
    id: "overview",
    title: "This week in your money",
    body: `Across your active session, tracked spend is ${formatMoney(spend, currency)} against ${formatMoney(inflow, currency)} inflow. Monthly income on file: ${formatMoney(ctx.monthly_income, currency)}.`,
  });

  if (ctx.archetype) {
    sections.push({
      id: "archetype",
      title: "Who you are financially",
      body: `Your current archetype is ${ctx.archetype.label}. Review Past for the full radar and burn trend.`,
    });
  }

  if (ctx.burn_rate) {
    sections.push({
      id: "burn",
      title: "Burn and runway",
      body: `Daily burn averages ${formatMoney(ctx.burn_rate.daily_avg, currency)}. Projected zero-balance date if income stopped: ${ctx.burn_rate.projected_zero_balance_date}.`,
    });
  }

  if (ctx.last_decide_verdict) {
    const v = ctx.last_decide_verdict;
    sections.push({
      id: "decide",
      title: "Latest decision",
      body: `You asked about ${v.item} (${formatMoney(v.amount, currency)}). Modeled runway shift: ${v.day_shift} day(s) → ${v.new_zero_balance_date}.`,
    });
  }

  const goalInsight = buildGoalInsight(ctx, currency);
  if (goalInsight) {
    sections.push({
      id: "ahead",
      title: goalInsight.headline,
      body: goalInsight.detail,
    });
  }

  const benches = buildBenchmarkInsights(ctx, currency).slice(0, 3);
  if (benches.length) {
    sections.push({
      id: "peers",
      title: "Peer snapshot",
      body: benches.map((b) => `${b.category}: ${b.insight}`).join(" "),
    });
  }

  return {
    title: "Your weekly foresight brief",
    generatedAt,
    periodLabel: "Last 7 days · session data",
    sections,
    links: [
      { label: "Open Past", href: "/past" },
      { label: "Open Decide", href: "/decide" },
      { label: "Open Ahead", href: "/ahead" },
    ],
  };
}
