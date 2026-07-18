import type { FinancialContext } from "@/types/financialContext";

export interface DecideVerdict {
  item: string;
  amount: number;
  day_shift: number;
  new_zero_balance_date: string;
  affordable: boolean;
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatDecideReply(
  rawReply: string,
  verdict: DecideVerdict | null,
  ctx: Partial<FinancialContext> | null,
  toolExplanation?: string
): string {
  if (!verdict) {
    const trimmed = rawReply.trim();
    if (trimmed.length >= 40) return trimmed;
    return (
      trimmed ||
      "Ask me something like \"Can I afford a ₹15,000 laptop?\" and I'll run canIAfford() against your real transaction history."
    );
  }

  const headline = verdict.affordable
    ? `Yes — you can afford ${verdict.item}`
    : `Not right now — ${verdict.item} would strain your runway`;

  const lines: string[] = [
    headline,
    "",
    `Amount: ${inr(verdict.amount)}`,
    `Zero-balance projection: ${verdict.new_zero_balance_date} (${verdict.day_shift >= 0 ? "+" : ""}${verdict.day_shift} day${Math.abs(verdict.day_shift) === 1 ? "" : "s"} vs baseline)`,
  ];

  if (ctx?.burn_rate) {
    lines.push(`Daily burn (consumption): ${inr(ctx.burn_rate.daily_avg)}/day`);
    const surplus = (ctx.monthly_income ?? 0) / 30 - ctx.burn_rate.daily_avg;
    if (surplus > 0) {
      lines.push(`Estimated daily surplus: ${inr(surplus)}/day (~${inr(surplus * 30)}/month after spend)`);
    } else {
      lines.push(`You're spending above income — daily deficit ~${inr(Math.abs(surplus))}/day`);
    }
  }

  if (ctx?.archetype?.label) {
    lines.push(`Spending archetype: ${ctx.archetype.label}`);
  }

  const narrative = (toolExplanation || rawReply).trim();
  if (narrative && narrative.length > 20) {
    lines.push("", "Analysis", narrative);
  }

  lines.push("", "Recommendation");
  if (verdict.affordable) {
    lines.push(
      verdict.day_shift > 14
        ? "Affordable, but it noticeably pulls your zero-balance date forward — consider timing this with your next salary credit."
        : "This fits your current trend. If you have an active savings goal, check AHEAD to see the pace impact."
    );
  } else {
    lines.push(
      "Postpone or reduce the spend. Trim discretionary categories (dining, shopping) for 2–3 weeks, or wait until your balance trend improves."
    );
  }

  if (ctx?.goal && ctx.goal.pace_gap_days != null) {
    lines.push(
      ctx.goal.on_pace
        ? `Your savings goal (${inr(ctx.goal.target_amount)} by ${ctx.goal.target_date}) remains on pace.`
        : `Your savings goal is ~${ctx.goal.pace_gap_days} day(s) behind — this purchase would widen that gap.`
    );
  }

  return lines.join("\n");
}
