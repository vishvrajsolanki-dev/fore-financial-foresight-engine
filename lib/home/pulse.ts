import type { FinancialContext } from "@/types/financialContext";

export type PulseAlert = {
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

export type HomePulse = {
  balance: number | null;
  burnDailyAvg: number | null;
  runwayDate: string | null;
  archetypeLabel: string | null;
  lastDecideVerdict: FinancialContext["last_decide_verdict"];
  goal: FinancialContext["goal"];
  dataSource: string | null;
  alerts: PulseAlert[];
};

/** Pure assembler — no ML recompute; uses persisted spine + precomputed alerts. */
export function buildHomePulse(
  ctx: FinancialContext | null,
  opts: { dataSource?: string | null; alerts?: PulseAlert[] } = {}
): HomePulse {
  const alerts = opts.alerts ?? [];
  if (!ctx) {
    return {
      balance: null,
      burnDailyAvg: null,
      runwayDate: null,
      archetypeLabel: null,
      lastDecideVerdict: null,
      goal: null,
      dataSource: opts.dataSource ?? null,
      alerts: [],
    };
  }

  const balance = ctx.transactions?.reduce((s, t) => s + t.amount, 0) ?? null;

  return {
    balance,
    burnDailyAvg: ctx.burn_rate?.daily_avg ?? null,
    runwayDate: ctx.burn_rate?.projected_zero_balance_date ?? null,
    archetypeLabel: ctx.archetype?.label ?? null,
    lastDecideVerdict: ctx.last_decide_verdict ?? null,
    goal: ctx.goal ?? null,
    dataSource: opts.dataSource ?? null,
    alerts,
  };
}
